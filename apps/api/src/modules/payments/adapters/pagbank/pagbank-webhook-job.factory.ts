import type {
  BuildPaymentWebhookJobInput,
  PaymentWebhookJob,
  PaymentWebhookJobFactory,
} from '../../application/ports/payment-webhook-job-factory.port';
import { PaymentStatusPolicy } from '../../domain/payment-status.policy';
import type { GatewayPaymentStatus } from '../../domain/payment-status.policy';

type PagBankWebhookPayload = {
  readonly id?: string;
  readonly referenceId?: string;
  readonly status?: string;
};

export class PagBankWebhookJobFactory implements PaymentWebhookJobFactory {
  public constructor(private readonly getReceivedAt: () => Date = (): Date => new Date()) {}

  public build(input: BuildPaymentWebhookJobInput): PaymentWebhookJob | null {
    const payload = this.toWebhookPayload(input.payload);
    const paymentId = payload.id || input.productId;
    const referenceId = this.normalizeReferenceId(payload.referenceId);
    const status = this.mapStatus(payload.status);

    if (!paymentId) return null;
    if (String(paymentId).startsWith('CHAR_') && !referenceId) return null;

    return {
      paymentId: String(paymentId),
      referenceId,
      status,
      receivedAt: this.getReceivedAt().toISOString(),
    };
  }

  private normalizeReferenceId(referenceId: string | undefined): string | undefined {
    if (!referenceId) return undefined;
    return referenceId.startsWith('card-') ? referenceId.slice(5) : referenceId;
  }

  private mapStatus(status: string | undefined): GatewayPaymentStatus | undefined {
    return PaymentStatusPolicy.create().fromGatewayChargeStatus(status);
  }

  private toWebhookPayload(body: unknown): PagBankWebhookPayload {
    if (!this.isRecord(body)) {
      return {};
    }

    return {
      id: this.optionalString(body.id),
      referenceId: this.optionalString(body.reference_id),
      status: this.optionalString(body.status),
    };
  }

  private optionalString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
