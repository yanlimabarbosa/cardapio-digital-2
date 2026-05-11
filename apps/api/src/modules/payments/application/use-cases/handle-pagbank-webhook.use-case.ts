import type {
  PaymentWebhookJobFactory,
  PaymentWebhookJob,
} from '../ports/payment-webhook-job-factory.port';
import type { PaymentWebhookQueue } from '../ports/payment-webhook-queue.port';
import type { PaymentWebhookSettings } from '../ports/payment-webhook-settings.port';
import type { PaymentWebhookSignatureVerifier } from '../ports/payment-webhook-signature-verifier.port';

export type HandlePagBankWebhookCommand = {
  authenticityToken?: string;
  payload: unknown;
  productId?: string;
  rawBody?: Buffer;
};

export type HandlePagBankWebhookResult = {
  received: true;
};

export class PaymentWebhookForbiddenError extends Error {
  public override readonly name = 'PaymentWebhookForbiddenError';

  public constructor(message: string) {
    super(message);
  }
}

export class HandlePagBankWebhookUseCase {
  public constructor(
    private readonly settings: PaymentWebhookSettings,
    private readonly signatureVerifier: PaymentWebhookSignatureVerifier,
    private readonly jobFactory: PaymentWebhookJobFactory,
    private readonly queue: PaymentWebhookQueue,
  ) {}

  public async execute(command: HandlePagBankWebhookCommand): Promise<HandlePagBankWebhookResult> {
    const webhookToken = this.settings.getWebhookToken();

    if (webhookToken) {
      this.assertValidSignature(webhookToken, command);
    } else if (this.settings.isProduction()) {
      throw new PaymentWebhookForbiddenError('PagBank webhook token not configured');
    }

    const paymentJob = this.jobFactory.build({
      payload: command.payload,
      productId: command.productId,
    });

    if (paymentJob) {
      await this.queue.enqueue(paymentJob);
    }

    return { received: true };
  }

  private assertValidSignature(token: string, command: HandlePagBankWebhookCommand): void {
    const isValid = this.signatureVerifier.verify({
      token,
      authenticityToken: command.authenticityToken,
      rawBody: command.rawBody,
    });

    if (!isValid) {
      throw new PaymentWebhookForbiddenError('Invalid PagBank webhook signature');
    }
  }
}
