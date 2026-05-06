import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EntityManager } from '@mikro-orm/postgresql';
import { Order } from '../../entities';
import { OrderStatus, PaymentStatus } from '@cardapio/shared';
import { GatewayPaymentStatus, PaymentsService } from './payments.service';
import { KitchenGateway } from '../websocket/websocket.gateway';
import { PAYMENT_QUEUE } from './payment.constants';

type PaymentJobData = {
  paymentId: string;
  referenceId?: string;
  status?: GatewayPaymentStatus;
  receivedAt?: string;
};

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

  async process(job: Job<PaymentJobData>) {
    const em = this.em.fork();

    if (job.data.referenceId && job.data.status) {
      return this.applyPaymentResult(em, {
        paymentId: job.data.paymentId,
        referenceId: job.data.referenceId,
        status: job.data.status,
      });
    }

    const pagBankOrder = await this.paymentsService.getPagBankOrder(job.data.paymentId);

    return this.applyPaymentResult(em, {
      paymentId: pagBankOrder.id,
      referenceId: pagBankOrder.reference_id,
      status: this.paymentsService.mapPagBankOrderStatus(pagBankOrder),
    });
  }

  private async applyPaymentResult(
    em: EntityManager,
    payment: {
      paymentId: string;
      referenceId?: string;
      status: GatewayPaymentStatus;
    },
  ) {
    let order = await em.findOne(Order, { paymentId: payment.paymentId }, { populate: ['items'] });
    if (!order && payment.referenceId) {
      order = await em.findOne(Order, { id: payment.referenceId }, { populate: ['items'] });
    }
    if (!order) {
      throw new Error(`Order not found for payment ${payment.paymentId}`);
    }

    if (order.paymentStatus === PaymentStatus.APPROVED && payment.status === 'approved') {
      this.logger.debug(`Payment ${payment.paymentId} already processed - skipped`);
      return { skipped: true };
    }

    const terminalStatuses = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];
    if (terminalStatuses.includes(order.status as OrderStatus)) {
      this.logger.warn(`Payment ${payment.paymentId} arrived for terminal order ${order.id} (${order.status}) - skipped`);
      return { skipped: true, reason: `Order already in terminal state: ${order.status}` };
    }

    if (payment.status === 'approved') {
      order.paymentStatus = PaymentStatus.APPROVED;
      order.status = OrderStatus.PAID;
      this.logger.log(`PagBank payment ${payment.paymentId} APPROVED - Order #${order.orderNumber} marked as paid`);
    } else if (payment.status === 'rejected') {
      order.paymentStatus = PaymentStatus.REJECTED;
      this.logger.warn(`PagBank payment ${payment.paymentId} REJECTED - Order #${order.orderNumber}`);
    } else if (payment.status === 'refunded') {
      order.paymentStatus = PaymentStatus.REFUNDED;
      this.logger.warn(`PagBank payment ${payment.paymentId} REFUNDED - Order #${order.orderNumber}`);
    } else {
      order.paymentStatus = PaymentStatus.PENDING;
    }

    await em.flush();

    if (payment.status === 'approved') {
      this.kitchenGateway.emitNewOrder(order);
    }

    return { processed: true, status: payment.status };
  }
}
