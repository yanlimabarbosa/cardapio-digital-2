import { createHash, timingSafeEqual } from 'node:crypto';
import type {
  PaymentWebhookSignatureVerifier,
  VerifyPaymentWebhookSignatureInput,
} from '../../application/ports/payment-webhook-signature-verifier.port';

export class PagBankWebhookSignatureVerifier implements PaymentWebhookSignatureVerifier {
  public verify(input: VerifyPaymentWebhookSignatureInput): boolean {
    if (!input.token || !input.authenticityToken || !input.rawBody) return false;

    const payload = input.rawBody.toString('utf8');
    const expected = createHash('sha256')
      .update(`${input.token}-${payload}`)
      .digest('hex');

    return this.safeCompare(expected, input.authenticityToken);
  }

  private safeCompare(expected: string, received: string): boolean {
    if (expected.length !== received.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  }
}
