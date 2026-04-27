import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EntityManager } from '@mikro-orm/postgresql';
import { Order } from '../../entities';
import { OrderStatus, PaymentStatus } from '@cardapio/shared';
import { PaymentsService } from './payments.service';
import { KitchenGateway } from '../websocket/websocket.gateway';
import { PAYMENT_QUEUE } from './payment.constants';

@Processor(PAYMENT_QUEUE)
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private readonly em: EntityManager,
    private readonly paymentsService: PaymentsService,
    private readonly kitchenGateway: KitchenGateway,
  ) {
    super();
  }

  async process(job: Job<{ paymentId: string }>) {
    const { paymentId } = job.data;
    const em = this.em.fork();

    const mpPayment = await this.paymentsService.getPaymentApi().get({ id: Number(paymentId) });

    let order = await em.findOne(Order, { paymentId: String(mpPayment.id) }, { populate: ['items'] });
    if (!order && mpPayment.external_reference) {
      order = await em.findOne(Order, { id: mpPayment.external_reference }, { populate: ['items'] });
    }
    if (!order) {
      throw new Error(`Order not found for payment ${paymentId}`);
    }

    if (order.paymentStatus === PaymentStatus.APPROVED && mpPayment.status === 'approved') {
      this.logger.debug(`Payment ${paymentId} already processed — skipped`);
      return { skipped: true };
    }

    const terminalStatuses = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];
    if (terminalStatuses.includes(order.status as OrderStatus)) {
      this.logger.warn(`Payment ${paymentId} arrived for terminal order ${order.id} (${order.status}) — skipped`);
      return { skipped: true, reason: `Order already in terminal state: ${order.status}` };
    }

    if (mpPayment.status === 'approved') {
      order.paymentStatus = PaymentStatus.APPROVED;
      order.status = OrderStatus.PAID;
      this.logger.log(`Payment ${paymentId} APPROVED — Order #${order.orderNumber} marked as paid`);
    } else if (mpPayment.status === 'rejected') {
      order.paymentStatus = PaymentStatus.REJECTED;
      this.logger.warn(`Payment ${paymentId} REJECTED — Order #${order.orderNumber}`);
    }

    await em.flush();

    if (mpPayment.status === 'approved') {
      this.kitchenGateway.emitNewOrder(order);
    }

    return { processed: true, status: mpPayment.status };
  }
}
