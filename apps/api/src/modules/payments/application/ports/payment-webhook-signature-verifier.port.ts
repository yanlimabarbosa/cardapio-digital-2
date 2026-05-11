export const PAYMENT_WEBHOOK_SIGNATURE_VERIFIER = Symbol('PAYMENT_WEBHOOK_SIGNATURE_VERIFIER');

export type VerifyPaymentWebhookSignatureInput = {
  authenticityToken?: string;
  rawBody?: Buffer;
  token: string;
};

export interface PaymentWebhookSignatureVerifier {
  verify(input: VerifyPaymentWebhookSignatureInput): boolean;
}
