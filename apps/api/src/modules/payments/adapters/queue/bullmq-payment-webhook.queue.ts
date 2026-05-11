import type {
  PaymentWebhookJob,
} from '../../application/ports/payment-webhook-job-factory.port';
import type { PaymentWebhookQueue } from '../../application/ports/payment-webhook-queue.port';

export type BullMqPaymentWebhookJobOptions = {
  readonly attempts: number;
  readonly backoff: {
    readonly delay: number;
    readonly type: 'exponential';
  };
  readonly jobId: string;
};

export type BullMqPaymentWebhookAddQueue = {
  add(
    name: string,
    data: PaymentWebhookJob,
    options: BullMqPaymentWebhookJobOptions,
  ): Promise<unknown>;
};

export class BullMqPaymentWebhookQueue implements PaymentWebhookQueue {
  public constructor(private readonly paymentQueue: BullMqPaymentWebhookAddQueue) {}

  public async enqueue(job: PaymentWebhookJob): Promise<void> {
    await this.paymentQueue.add(
      'process-payment',
      job,
      {
        jobId: `pagbank-payment-${job.paymentId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  }
}
