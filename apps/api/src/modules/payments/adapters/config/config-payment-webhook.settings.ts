import type { PaymentWebhookSettings } from '../../application/ports/payment-webhook-settings.port';

export type PaymentWebhookConfig = {
  get<T>(key: string, defaultValue: T): T;
};

export class ConfigPaymentWebhookSettings implements PaymentWebhookSettings {
  public constructor(private readonly configService: PaymentWebhookConfig) {}

  public getWebhookToken(): string {
    return this.configService.get<string>('PAGBANK_WEBHOOK_TOKEN', '');
  }

  public isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV', process.env.NODE_ENV ?? '') === 'production';
  }
}
