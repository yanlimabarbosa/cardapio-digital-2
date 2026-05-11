export const PAYMENT_WEBHOOK_SETTINGS = Symbol('PAYMENT_WEBHOOK_SETTINGS');

export interface PaymentWebhookSettings {
  getWebhookToken(): string;
  isProduction(): boolean;
}
