import type { PaymentWebhookJob } from './payment-webhook-job-factory.port';

export const PAYMENT_WEBHOOK_QUEUE = Symbol('PAYMENT_WEBHOOK_QUEUE');

export interface PaymentWebhookQueue {
  enqueue(job: PaymentWebhookJob): Promise<void>;
}
