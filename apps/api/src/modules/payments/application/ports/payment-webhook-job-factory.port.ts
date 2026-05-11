import type { GatewayPaymentStatus } from '../../domain/payment-status.policy';

export const PAYMENT_WEBHOOK_JOB_FACTORY = Symbol('PAYMENT_WEBHOOK_JOB_FACTORY');

export type PaymentWebhookJob = {
  readonly paymentId: string;
  readonly receivedAt: string;
  readonly referenceId?: string;
  readonly status?: GatewayPaymentStatus;
};

export type BuildPaymentWebhookJobInput = {
  readonly payload: unknown;
  readonly productId?: string;
};

export interface PaymentWebhookJobFactory {
  build(input: BuildPaymentWebhookJobInput): PaymentWebhookJob | null;
}
