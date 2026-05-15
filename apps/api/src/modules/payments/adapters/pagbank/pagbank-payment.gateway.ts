import { BadRequestException, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { appendFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import {
  type CardPaymentResult,
  type CreateCreditCardPaymentInput,
  type CreateDebitCardPaymentInput,
  type CreatePixPaymentInput,
  type GetPaymentStatusQuery,
  type Payment3dsSessionResult,
  type PaymentGateway,
  type PaymentGatewayStatusResult,
  type PixPaymentResult,
} from '../../application/ports/payment-gateway.port';
import type { PaymentOrder } from '../../application/ports/payment-order.port';
import { PaymentStatusPolicy, type GatewayPaymentStatus } from '../../domain/payment-status.policy';

type PagBankLink = {
  readonly href?: string;
  readonly media?: string;
  readonly rel?: string;
  readonly type?: string;
};

type PagBankQrCode = {
  readonly expiration_date?: string;
  readonly id?: string;
  readonly links?: readonly PagBankLink[];
  readonly text?: string;
};

type PagBankCharge = {
  readonly payment_response?: {
    readonly message?: string;
  };
  readonly status?: string;
};

type PagBankOrder = {
  readonly charges?: readonly PagBankCharge[];
  readonly id: string;
  readonly qr_codes?: readonly PagBankQrCode[];
  readonly reference_id?: string;
};

type PagBank3dsSession = {
  readonly expires_at: number;
  readonly session: string;
};

type PagBankPhonePayload = {
  readonly area: string;
  readonly country: '55';
  readonly number: string;
  readonly type: 'MOBILE';
};

type PagBankCustomerPayload = {
  readonly email: string;
  readonly name: string;
  readonly phones?: readonly PagBankPhonePayload[];
  readonly tax_id: string;
};

type PagBankItemPayload = {
  readonly name: string;
  readonly quantity: number;
  readonly reference_id: string;
  readonly unit_amount: number;
};

type PagBankShippingPayload = {
  readonly address: {
    readonly city: string;
    readonly complement?: string;
    readonly country: 'BRA';
    readonly locality: string;
    readonly number: string;
    readonly postal_code: string;
    readonly region_code: string;
    readonly street: string;
  };
};

type CardChargePaymentInput = {
  readonly authenticationId?: string;
  readonly cardholderName: string;
  readonly encryptedCard: string;
  readonly installments: number;
  readonly order: PaymentOrder;
  readonly payerEmail: string;
  readonly payerTaxId: string;
  readonly type: 'CREDIT_CARD' | 'DEBIT_CARD';
};

type PagBankEvidenceExchange = {
  readonly durationMs: number;
  readonly environment: string;
  readonly error?: {
    readonly message: string;
    readonly name?: string;
  };
  readonly method: string;
  readonly path: string;
  readonly requestBody?: unknown;
  readonly responseBody?: unknown;
  readonly responseStatus?: number;
  readonly service: 'orders-api' | 'qrcode-api' | 'sdk-api';
  readonly timestamp: string;
  readonly url: string;
};

export class PagBankPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(PagBankPaymentGateway.name);

  public constructor(private readonly configService: ConfigService) {}

  public async create3dsSession(): Promise<Payment3dsSessionResult> {
    const session = this.parsePagBank3dsSession(
      await this.pagBankSdkRequest('/checkout-sdk/sessions', { method: 'POST' }),
    );

    return {
      session: session.session,
      expiresAt: session.expires_at,
    };
  }

  public async createCreditCardPayment(input: CreateCreditCardPaymentInput): Promise<CardPaymentResult> {
    return this.createCardChargePayment({
      order: input.order,
      cardholderName: input.cardholderName,
      encryptedCard: input.encryptedCard,
      installments: input.installments,
      payerEmail: input.payerEmail,
      payerTaxId: input.payerTaxId,
      type: 'CREDIT_CARD',
    });
  }

  public async createDebitCardPayment(input: CreateDebitCardPaymentInput): Promise<CardPaymentResult> {
    return this.createCardChargePayment({
      order: input.order,
      authenticationId: input.authenticationId,
      cardholderName: input.cardholderName,
      encryptedCard: input.encryptedCard,
      installments: 1,
      payerEmail: input.payerEmail,
      payerTaxId: input.payerTaxId,
      type: 'DEBIT_CARD',
    });
  }

  public async createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    const notificationUrl = this.getNotificationUrl();

    const pagBankOrder = this.parsePagBankOrder(
      await this.pagBankRequest('/orders', {
        method: 'POST',
        body: this.withoutUndefined({
          reference_id: input.order.id,
          customer: this.buildPagBankCustomer(input.order, input.payerEmail, input.payerTaxId),
          items: this.buildPagBankItems(input.order),
          shipping: this.buildPagBankShipping(input.order),
          qr_codes: [
            {
              amount: {
                value: this.toCents(input.order.totalAmount),
              },
              expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            },
          ],
          notification_urls: notificationUrl ? [notificationUrl] : undefined,
        }),
      }),
    );

    const qrCode = pagBankOrder.qr_codes?.[0];

    return {
      paymentId: pagBankOrder.id,
      qrCode: qrCode?.text ?? '',
      qrCodeBase64: await this.getPagBankQrBase64(qrCode),
      expiresAt: qrCode?.expiration_date,
    };
  }

  public async getPaymentStatus(query: GetPaymentStatusQuery): Promise<PaymentGatewayStatusResult> {
    const pagBankOrder = this.parsePagBankOrder(
      await this.pagBankRequest(`/orders/${query.externalId}`, { method: 'GET' }),
    );

    return {
      externalId: pagBankOrder.id,
      referenceId: pagBankOrder.reference_id,
      status: this.mapPagBankOrderStatus(pagBankOrder),
    };
  }

  private async createCardChargePayment(input: CardChargePaymentInput): Promise<CardPaymentResult> {
    const notificationUrl = this.getNotificationUrl();

    const pagBankOrder = this.parsePagBankOrder(
      await this.pagBankRequest('/orders', {
        method: 'POST',
        body: this.withoutUndefined({
          reference_id: input.order.id,
          customer: this.buildPagBankCustomer(input.order, input.payerEmail, input.payerTaxId),
          items: this.buildPagBankItems(input.order),
          shipping: this.buildPagBankShipping(input.order),
          notification_urls: notificationUrl ? [notificationUrl] : undefined,
          charges: [
            {
              reference_id: input.order.id,
              description: `Pedido #${input.order.orderNumber}`,
              amount: {
                value: this.toCents(input.order.totalAmount),
                currency: 'BRL',
              },
              payment_method: this.withoutUndefined({
                type: input.type,
                installments: input.installments,
                capture: true,
                card: {
                  encrypted: input.encryptedCard,
                  store: false,
                },
                holder: {
                  name: input.cardholderName,
                  tax_id: input.payerTaxId.replace(/\D/g, ''),
                },
                authentication_method: input.authenticationId
                  ? {
                      type: 'THREEDS',
                      id: input.authenticationId,
                    }
                  : undefined,
              }),
            },
          ],
        }),
      }),
    );

    const status = this.mapPagBankOrderStatus(pagBankOrder);

    return {
      paymentId: pagBankOrder.id,
      status,
      statusDetail: this.getFirstChargeStatusDetail(pagBankOrder, status),
    };
  }

  private getNotificationUrl(): string | undefined {
    const url = this.configService.get<string>('API_PUBLIC_URL');
    if (url && !url.includes('localhost')) {
      return `${url}/api/webhooks/pagbank`;
    }
    return undefined;
  }

  private async pagBankRequest(pathname: string, init: { readonly method: string; readonly body?: unknown }): Promise<unknown> {
    const url = `${this.getPagBankBaseUrl()}${pathname}`;
    const startedAt = Date.now();
    let response: Response;

    try {
      response = await fetch(url, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${this.getPagBankAccessToken()}`,
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      });
    } catch (error: unknown) {
      await this.recordPagBankEvidence({
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        service: 'orders-api',
        environment: this.getPagBankEnvironment(),
        method: init.method,
        path: pathname,
        url,
        requestBody: init.body,
        error: this.toEvidenceError(error),
      });
      throw error;
    }

    const text = await response.text();
    const data = text ? this.parseJson(text) : null;

    await this.recordPagBankEvidence({
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      service: 'orders-api',
      environment: this.getPagBankEnvironment(),
      method: init.method,
      path: pathname,
      url,
      requestBody: init.body,
      responseStatus: response.status,
      responseBody: data,
    });

    if (!response.ok) {
      throw new BadRequestException(this.formatPagBankError(data, response.status));
    }

    return data;
  }

  private async pagBankSdkRequest(pathname: string, init: { readonly method: string; readonly body?: unknown }): Promise<unknown> {
    const url = `${this.getPagBankSdkBaseUrl()}${pathname}`;
    const startedAt = Date.now();
    let response: Response;

    try {
      response = await fetch(url, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${this.getPagBankAccessToken()}`,
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      });
    } catch (error: unknown) {
      await this.recordPagBankEvidence({
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        service: 'sdk-api',
        environment: this.getPagBankEnvironment(),
        method: init.method,
        path: pathname,
        url,
        requestBody: init.body,
        error: this.toEvidenceError(error),
      });
      throw error;
    }

    const text = await response.text();
    const data = text ? this.parseJson(text) : null;

    await this.recordPagBankEvidence({
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      service: 'sdk-api',
      environment: this.getPagBankEnvironment(),
      method: init.method,
      path: pathname,
      url,
      requestBody: init.body,
      responseStatus: response.status,
      responseBody: data,
    });

    if (!response.ok) {
      throw new BadRequestException(this.formatPagBankError(data, response.status));
    }

    return data;
  }

  private async getPagBankQrBase64(qrCode?: PagBankQrCode): Promise<string> {
    const base64Link = qrCode?.links?.find((link) => link.rel === 'QRCODE.BASE64' || link.media === 'text/plain');
    if (!base64Link?.href) return '';

    const startedAt = Date.now();

    try {
      const response = await fetch(base64Link.href, {
        headers: {
          Authorization: `Bearer ${this.getPagBankAccessToken()}`,
          Accept: 'text/plain',
        },
      });
      const text = await response.text();

      await this.recordPagBankEvidence({
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        service: 'qrcode-api',
        environment: this.getPagBankEnvironment(),
        method: 'GET',
        path: base64Link.href,
        url: base64Link.href,
        responseStatus: response.status,
        responseBody: text,
      });

      if (!response.ok) return '';
      return this.normalizeBase64Image(text.replace(/^data:image\/png;base64,/, '').trim());
    } catch (error: unknown) {
      await this.recordPagBankEvidence({
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        service: 'qrcode-api',
        environment: this.getPagBankEnvironment(),
        method: 'GET',
        path: base64Link.href,
        url: base64Link.href,
        error: this.toEvidenceError(error),
      });
      this.logger.warn(`Unable to fetch PagBank QR Code image: ${this.getErrorMessage(error)}`);
      return '';
    }
  }

  private getPagBankBaseUrl(): string {
    const override = this.configService.get<string>('PAGBANK_API_URL');
    if (override) return override.replace(/\/$/, '');

    const environment = this.getPagBankEnvironment();
    return environment === 'production' ? 'https://api.pagseguro.com' : 'https://sandbox.api.pagseguro.com';
  }

  private getPagBankSdkBaseUrl(): string {
    const override = this.configService.get<string>('PAGBANK_SDK_URL');
    if (override) return override.replace(/\/$/, '');

    const environment = this.getPagBankEnvironment();
    return environment === 'production' ? 'https://sdk.pagseguro.com' : 'https://sandbox.sdk.pagseguro.com';
  }

  private getPagBankAccessToken(): string {
    const token = this.configService.get<string>('PAGBANK_ACCESS_TOKEN');
    if (!token) {
      throw new BadRequestException('PagBank access token is not configured');
    }
    return token;
  }

  private getPagBankEnvironment(): string {
    return this.configService.get<string>('PAGBANK_ENV', 'sandbox').toLowerCase();
  }

  private parseJson(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private parsePagBankOrder(value: unknown): PagBankOrder {
    if (!this.isRecord(value) || typeof value.id !== 'string') {
      throw new BadRequestException('PagBank order response is missing id');
    }

    const chargesValue = value.charges;

    return {
      id: value.id,
      reference_id: typeof value.reference_id === 'string' ? value.reference_id : undefined,
      qr_codes: this.parseQrCodes(value.qr_codes),
      charges: Array.isArray(chargesValue)
        ? chargesValue
            .filter((charge): charge is Record<string, unknown> => this.isRecord(charge))
            .map((charge): PagBankCharge => ({
              status: typeof charge.status === 'string' ? charge.status : undefined,
              payment_response: this.parsePaymentResponse(charge.payment_response),
            }))
        : undefined,
    };
  }

  private parsePaymentResponse(value: unknown): { readonly message?: string } | undefined {
    if (!this.isRecord(value)) return undefined;

    return {
      message: typeof value.message === 'string' ? value.message : undefined,
    };
  }

  private parsePagBank3dsSession(value: unknown): PagBank3dsSession {
    if (!this.isRecord(value) || typeof value.session !== 'string' || typeof value.expires_at !== 'number') {
      throw new BadRequestException('PagBank 3DS session response is invalid');
    }

    return {
      session: value.session,
      expires_at: value.expires_at,
    };
  }

  private mapPagBankOrderStatus(order: PagBankOrder): GatewayPaymentStatus {
    return PaymentStatusPolicy.create().fromGatewayChargeStatuses(
      order.charges?.map((charge): string | undefined => charge.status) ?? [],
    );
  }

  private getFirstChargeStatusDetail(order: PagBankOrder, fallback: GatewayPaymentStatus): string {
    const charge = order.charges?.[0];

    return charge?.payment_response?.message ?? charge?.status ?? fallback;
  }

  private parseQrCodes(value: unknown): readonly PagBankQrCode[] | undefined {
    if (!Array.isArray(value)) return undefined;

    return value
      .filter((qrCode): qrCode is Record<string, unknown> => this.isRecord(qrCode))
      .map((qrCode): PagBankQrCode => ({
        id: typeof qrCode.id === 'string' ? qrCode.id : undefined,
        text: typeof qrCode.text === 'string' ? qrCode.text : undefined,
        expiration_date: typeof qrCode.expiration_date === 'string' ? qrCode.expiration_date : undefined,
        links: this.parseLinks(qrCode.links),
      }));
  }

  private parseLinks(value: unknown): readonly PagBankLink[] | undefined {
    if (!Array.isArray(value)) return undefined;

    return value
      .filter((link): link is Record<string, unknown> => this.isRecord(link))
      .map((link): PagBankLink => ({
        rel: typeof link.rel === 'string' ? link.rel : undefined,
        href: typeof link.href === 'string' ? link.href : undefined,
        media: typeof link.media === 'string' ? link.media : undefined,
        type: typeof link.type === 'string' ? link.type : undefined,
      }));
  }

  private formatPagBankError(data: unknown, status: number): string {
    if (this.isRecord(data)) {
      const errorMessages = data.error_messages;
      if (Array.isArray(errorMessages) && errorMessages.length > 0) {
        const formattedMessages = errorMessages
          .filter((error): error is Record<string, unknown> => this.isRecord(error))
          .map((error): string =>
            [error.code, error.parameter_name, error.description]
              .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
              .join(' - '),
          )
          .filter((message): boolean => message.length > 0)
        if (formattedMessages.length > 0) {
          return formattedMessages.join('; ');
        }
      }

      if (typeof data.message === 'string') {
        return data.message;
      }
    }

    return `PagBank request failed with status ${status}`;
  }

  private async recordPagBankEvidence(exchange: PagBankEvidenceExchange): Promise<void> {
    const file = this.getPagBankEvidenceFile();
    if (!file) return;

    try {
      await mkdir(path.dirname(file), { recursive: true });
      await appendFile(file, `${JSON.stringify(this.sanitizePagBankEvidence(exchange))}\n`);
    } catch (error: unknown) {
      this.logger.warn(`Unable to write PagBank evidence: ${this.getErrorMessage(error)}`);
    }
  }

  private getPagBankEvidenceFile(): string | undefined {
    const enabled = this.configService.get<string>('PAGBANK_EVIDENCE_ENABLED');
    if (enabled?.toLowerCase() === 'false') return undefined;

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    if (isProduction && enabled?.toLowerCase() !== 'true') return undefined;

    const explicitFile = this.configService.get<string>('PAGBANK_EVIDENCE_FILE');
    if (explicitFile) return this.resolveEvidencePath(explicitFile);

    const explicitDir = this.configService.get<string>('PAGBANK_EVIDENCE_DIR');
    const evidenceDir = explicitDir
      ? this.resolveEvidencePath(explicitDir)
      : path.join(this.getWorkspaceRoot(), 'test-results', 'pagbank-homologation');

    return path.join(evidenceDir, 'pagbank-backend-exchanges.jsonl');
  }

  private resolveEvidencePath(value: string): string {
    return path.isAbsolute(value) ? value : path.join(this.getWorkspaceRoot(), value);
  }

  private getWorkspaceRoot(): string {
    const cwd = process.cwd();
    if (path.basename(cwd) === 'api' && path.basename(path.dirname(cwd)) === 'apps') {
      return path.resolve(cwd, '../..');
    }
    return cwd;
  }

  private sanitizePagBankEvidence(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((entry): unknown => this.sanitizePagBankEvidence(entry));
    if (typeof value === 'string') return this.sanitizePagBankString(value);
    if (!this.isRecord(value)) return value;

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]): [string, unknown] => {
        const normalizedKey = key.toLowerCase();

        if (normalizedKey.includes('authorization') || normalizedKey.includes('access_token') || normalizedKey === 'token') {
          return [key, '<redacted>'];
        }

        if (normalizedKey === 'encrypted' || normalizedKey === 'encryptedcard') {
          return [
            key,
            typeof entry === 'string'
              ? `<encrypted-card:${entry.length}:prefix:${entry.slice(0, 16)}>`
              : '<encrypted-card>',
          ];
        }

        if (normalizedKey === 'session') {
          return [key, typeof entry === 'string' ? `<pagbank-3ds-session:${entry.length}>` : '<pagbank-3ds-session>'];
        }

        if (normalizedKey === 'id' && typeof entry === 'string' && entry.startsWith('3DS_')) {
          return [key, `<pagbank-3ds-auth:${entry.slice(0, 8)}...>`];
        }

        if (normalizedKey === 'authenticationid' && typeof entry === 'string' && entry.startsWith('3DS_')) {
          return [key, `<pagbank-3ds-auth:${entry.slice(0, 8)}...>`];
        }

        if (normalizedKey === 'text' && typeof entry === 'string' && entry.startsWith('000201')) {
          return [key, `<pix-copy-paste:${entry.length}:prefix:${entry.slice(0, 20)}>`];
        }

        if (normalizedKey === 'qrcodebase64' || (typeof entry === 'string' && this.looksLikeBase64QrCode(entry))) {
          return [key, typeof entry === 'string' ? `<base64-qrcode:${entry.length}>` : '<base64-qrcode>'];
        }

        if (normalizedKey === 'tax_id') {
          return [key, this.maskDigits(String(entry ?? ''))];
        }

        if (normalizedKey.includes('email') && typeof entry === 'string') {
          return [key, this.maskEmail(entry)];
        }

        if (normalizedKey === 'number' && typeof entry === 'string' && /^\d{8,13}$/.test(entry)) {
          return [key, this.maskDigits(entry)];
        }

        return [key, this.sanitizePagBankEvidence(entry)];
      }),
    );
  }

  private sanitizePagBankString(value: string): string {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return this.maskEmail(value);
    }
    if (value.startsWith('000201')) {
      return `<pix-copy-paste:${value.length}:prefix:${value.slice(0, 20)}>`;
    }
    if (this.looksLikeBase64QrCode(value)) {
      return `<base64-qrcode:${value.length}>`;
    }
    return value;
  }

  private looksLikeBase64QrCode(value: string): boolean {
    return value.length > 200 && /^[A-Za-z0-9+/=_-]+$/.test(value);
  }

  private maskDigits(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return '<redacted-digits>';
    return `${digits.slice(0, 3)}${'*'.repeat(Math.max(0, digits.length - 5))}${digits.slice(-2)}`;
  }

  private maskEmail(value: string): string {
    const [name, domain] = value.split('@');
    if (!name || !domain) return '<redacted-email>';
    const visible = name.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(3, name.length - visible.length))}@${domain}`;
  }

  private buildPagBankCustomer(order: PaymentOrder, email?: string, taxId?: string): PagBankCustomerPayload {
    const customerEmail = email || order.customerEmail;
    const customerTaxId = taxId?.replace(/\D/g, '');

    if (!customerEmail) {
      throw new BadRequestException('E-mail do pagador e obrigatorio para pagamentos PagBank');
    }
    if (!customerTaxId) {
      throw new BadRequestException('CPF do pagador e obrigatorio para pagamentos PagBank');
    }

    return this.withoutUndefined({
      name: order.customerName,
      email: customerEmail,
      tax_id: customerTaxId,
      phones: this.buildPagBankPhones(order.customerPhone),
    });
  }

  private buildPagBankPhones(phone?: string): readonly PagBankPhonePayload[] | undefined {
    const digits = phone?.replace(/\D/g, '') ?? '';
    if (digits.length < 10) return undefined;

    const normalized = digits.startsWith('55') ? digits.slice(2) : digits;
    if (normalized.length < 10) return undefined;

    return [
      {
        country: '55',
        area: normalized.slice(0, 2),
        number: normalized.slice(2),
        type: 'MOBILE',
      },
    ];
  }

  private buildPagBankItems(order: PaymentOrder): readonly PagBankItemPayload[] {
    return [
      {
        reference_id: order.id,
        name: `Pedido #${order.orderNumber}`,
        quantity: 1,
        unit_amount: this.toCents(order.totalAmount),
      },
    ];
  }

  private buildPagBankShipping(order: PaymentOrder): PagBankShippingPayload | undefined {
    const address = order.deliveryAddress;
    if (!address) return undefined;

    return {
      address: this.withoutUndefined({
        street: address.street,
        number: address.number || 'SN',
        complement: address.complement,
        locality: address.neighborhood,
        city: address.city,
        region_code: address.state,
        country: 'BRA',
        postal_code: address.cep.replace(/\D/g, ''),
      }),
    };
  }

  private toCents(value: string | number): number {
    return Math.round(Number(value) * 100);
  }

  private withoutUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
  }

  private normalizeBase64Image(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    return padding === 0 ? normalized : `${normalized}${'='.repeat(4 - padding)}`;
  }

  private toEvidenceError(error: unknown): { readonly message: string; readonly name?: string } {
    return {
      name: error instanceof Error ? error.name : undefined,
      message: this.getErrorMessage(error),
    };
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
