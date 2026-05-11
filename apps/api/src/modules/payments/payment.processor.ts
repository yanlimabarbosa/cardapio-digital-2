import { MikroORM, RequestContext } from '@mikro-orm/core';
import { Inject, Logger, Optional } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import type { GatewayPaymentStatus } from './domain/payment-status.policy';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from './application/ports/payment-gateway.port';
import {
  PAYMENT_ORDER_REPOSITORY,
  type ApplyQueuedPaymentResultCommand,
  type PaymentOrderRepository,
} from './application/ports/payment-order.port';
import {
  PAYMENT_REALTIME_NOTIFIER,
  type PaymentRealtimeNotifier,
} from './application/ports/payment-realtime-notifier.port';
import { PAYMENT_QUEUE } from './payment.constants';

type PaymentJobData = {
  paymentId: string;
  referenceId?: string;
  status?: GatewayPaymentStatus;
  receivedAt?: string;
};

type PaymentProcessResult =
  | {
    readonly processed: true;
    readonly status: GatewayPaymentStatus;
  }
  | {
    readonly reason?: string;
    readonly skipped: true;
  };

@Processor(PAYMENT_QUEUE)
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  public constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    @Inject(PAYMENT_ORDER_REPOSITORY)
    private readonly paymentOrders: PaymentOrderRepository,
    @Inject(PAYMENT_REALTIME_NOTIFIER)
    private readonly paymentRealtimeNotifier: PaymentRealtimeNotifier,
    @Optional()
    private readonly orm?: MikroORM,
  ) {
    super();
  }

  public async process(job: Job<PaymentJobData>): Promise<PaymentProcessResult> {
    if (this.orm) {
      return RequestContext.create(this.orm.em, async (): Promise<PaymentProcessResult> => this.processPaymentJob(job));
    }

    return this.processPaymentJob(job);
  }

  private async processPaymentJob(job: Job<PaymentJobData>): Promise<PaymentProcessResult> {
    if (job.data.referenceId && job.data.status) {
      return this.applyPaymentResult({
        paymentId: job.data.paymentId,
        referenceId: job.data.referenceId,
        status: job.data.status,
      });
    }

    const paymentStatus = await this.paymentGateway.getPaymentStatus({ externalId: job.data.paymentId });

    return this.applyPaymentResult({
      paymentId: paymentStatus.externalId,
      referenceId: paymentStatus.referenceId,
      status: paymentStatus.status,
    });
  }

  private async applyPaymentResult(payment: ApplyQueuedPaymentResultCommand): Promise<PaymentProcessResult> {
    const result = await this.paymentOrders.applyQueuedPaymentResult(payment);

    if ('skipped' in result) {
      if (result.reason) {
        this.logger.warn(
          `Payment ${payment.paymentId} arrived for terminal order ${result.order.id} (${result.order.status}) - skipped`,
        );
        return { skipped: true, reason: result.reason };
      }

      this.logger.debug(`Payment ${payment.paymentId} already processed - skipped`);
      return { skipped: true };
    }

    if (payment.status === 'approved') {
      this.logger.log(`PagBank payment ${payment.paymentId} APPROVED - Order #${result.order.orderNumber} marked as paid`);
    } else if (payment.status === 'rejected') {
      this.logger.warn(`PagBank payment ${payment.paymentId} REJECTED - Order #${result.order.orderNumber}`);
    } else if (payment.status === 'refunded') {
      this.logger.warn(`PagBank payment ${payment.paymentId} REFUNDED - Order #${result.order.orderNumber}`);
    }

    if (result.newOrderNotification) {
      await this.paymentRealtimeNotifier.newOrderPaid(result.newOrderNotification);
    }

    return { processed: true, status: payment.status };
  }
}
