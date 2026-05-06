import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { appendFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { Order } from '../../entities';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import { CreateCardPaymentDto } from './dto/create-card-payment.dto';
import { CreateDebitCardPaymentDto } from './dto/create-debit-card-payment.dto';
import { CreatePixPaymentDto } from './dto/create-pix-payment.dto';
import { KitchenGateway } from '../websocket/websocket.gateway';

export type GatewayPaymentStatus = 'approved' | 'pending' | 'rejected' | 'refunded';

export interface PagBankLink {
  rel?: string;
  href?: string;
  media?: string;
  type?: string;
}

export interface PagBankQrCode {
  id?: string;
  text?: string;
  expiration_date?: string;
  links?: PagBankLink[];
}

export interface PagBankCharge {
  id?: string;
  reference_id?: string;
  status?: string;
  payment_response?: {
    code?: string;
    message?: string;
  };
}

export interface PagBankOrder {
  id: string;
  reference_id?: string;
  qr_codes?: PagBankQrCode[];
  charges?: PagBankCharge[];
}

export interface PagBank3dsSession {
  session: string;
  expires_at: number;
}

interface PagBankEvidenceExchange {
  timestamp: string;
  durationMs: number;
  service: 'orders-api' | 'sdk-api' | 'qrcode-api';
  environment: string;
  method: string;
  path: string;
  url: string;
  requestBody?: unknown;
  responseStatus?: number;
  responseBody?: unknown;
  error?: {
    name?: string;
    message: string;
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly kitchenGateway: KitchenGateway,
  ) {}

  private getNotificationUrl(): string | undefined {
    const url = this.configService.get<string>('API_PUBLIC_URL');
    if (url && !url.includes('localhost')) {
      return `${url}/api/webhooks/pagbank`;
    }
    return undefined;
  }

  async createPixPayment(dto: CreatePixPaymentDto) {
    const order = await this.ordersService.findById(dto.orderId);
    const notificationUrl = this.getNotificationUrl();

    const result = await this.pagBankRequest<PagBankOrder>('/orders', {
      method: 'POST',
      body: this.withoutUndefined({
        reference_id: order.id,
        customer: this.buildPagBankCustomer(order, dto.payerEmail, dto.payerTaxId),
        items: this.buildPagBankItems(order),
        shipping: this.buildPagBankShipping(order),
        qr_codes: [
          {
            amount: {
              value: this.toCents(order.totalAmount),
            },
            expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        ],
        notification_urls: notificationUrl ? [notificationUrl] : undefined,
      }),
    });

    const qrCode = result.qr_codes?.[0];

    order.paymentId = result.id;
    order.paymentStatus = PaymentStatus.PENDING;
    await this.em.flush();

    return {
      paymentId: result.id,
      qrCode: qrCode?.text ?? '',
      qrCodeBase64: await this.getPagBankQrBase64(qrCode),
      expiresAt: qrCode?.expiration_date,
    };
  }

  async createPagBank3dsSession() {
    const result = await this.pagBankSdkRequest<PagBank3dsSession>('/checkout-sdk/sessions', {
      method: 'POST',
    });

    return {
      session: result.session,
      expiresAt: result.expires_at,
    };
  }

  async createCardPayment(dto: CreateCardPaymentDto) {
    if (!dto.encryptedCard) {
      throw new BadRequestException('PagBank encrypted card is required');
    }

    const order = await this.ordersService.findById(dto.orderId);
    const notificationUrl = this.getNotificationUrl();

    const result = await this.pagBankRequest<PagBankOrder>('/orders', {
      method: 'POST',
      body: this.withoutUndefined({
        reference_id: order.id,
        customer: this.buildPagBankCustomer(order, dto.payerEmail, dto.identificationNumber),
        items: this.buildPagBankItems(order),
        shipping: this.buildPagBankShipping(order),
        notification_urls: notificationUrl ? [notificationUrl] : undefined,
        charges: [
          {
            reference_id: order.id,
            description: `Pedido #${order.orderNumber}`,
            amount: {
              value: this.toCents(order.totalAmount),
              currency: 'BRL',
            },
            payment_method: {
              type: 'CREDIT_CARD',
              installments: dto.installments,
              capture: true,
              card: {
                encrypted: dto.encryptedCard,
                store: false,
              },
              holder: {
                name: order.customerName,
                tax_id: dto.identificationNumber.replace(/\D/g, ''),
              },
            },
          },
        ],
      }),
    });

    order.paymentId = result.id;
    const mappedStatus = this.mapPagBankOrderStatus(result);
    await this.applyGatewayStatus(order, mappedStatus);

    const charge = result.charges?.[0];
    return {
      status: mappedStatus,
      statusDetail: charge?.payment_response?.message ?? charge?.status ?? mappedStatus,
      paymentId: result.id,
    };
  }

  async createDebitCardPayment(dto: CreateDebitCardPaymentDto) {
    if (!dto.encryptedCard) {
      throw new BadRequestException('PagBank encrypted card is required');
    }
    if (!dto.authenticationId) {
      throw new BadRequestException('PagBank 3DS authentication id is required');
    }
    const order = await this.ordersService.findById(dto.orderId);
    if (order.paymentMethod !== PaymentMethod.DEBIT_CARD) {
      throw new BadRequestException('Pedido nao foi criado para pagamento no debito');
    }

    const notificationUrl = this.getNotificationUrl();

    const result = await this.pagBankRequest<PagBankOrder>('/orders', {
      method: 'POST',
      body: this.withoutUndefined({
        reference_id: order.id,
        customer: this.buildPagBankCustomer(order, dto.payerEmail, dto.identificationNumber),
        items: this.buildPagBankItems(order),
        shipping: this.buildPagBankShipping(order),
        notification_urls: notificationUrl ? [notificationUrl] : undefined,
        charges: [
          {
            reference_id: order.id,
            description: `Pedido #${order.orderNumber}`,
            amount: {
              value: this.toCents(order.totalAmount),
              currency: 'BRL',
            },
            payment_method: {
              type: 'DEBIT_CARD',
              installments: 1,
              capture: true,
              card: {
                encrypted: dto.encryptedCard,
                store: false,
              },
              holder: {
                name: order.customerName,
                tax_id: dto.identificationNumber.replace(/\D/g, ''),
              },
              authentication_method: {
                type: 'THREEDS',
                id: dto.authenticationId,
              },
            },
          },
        ],
      }),
    });

    order.paymentId = result.id;
    const mappedStatus = this.mapPagBankOrderStatus(result);
    await this.applyGatewayStatus(order, mappedStatus);

    const charge = result.charges?.[0];
    return {
      status: mappedStatus,
      statusDetail: charge?.payment_response?.message ?? charge?.status ?? mappedStatus,
      paymentId: result.id,
    };
  }

  async getPaymentStatus(orderId: string) {
    const order = await this.ordersService.findById(orderId);

    if (
      order.paymentId &&
      order.paymentStatus !== PaymentStatus.APPROVED &&
      order.paymentStatus !== PaymentStatus.REJECTED
    ) {
      try {
        const pagBankOrder = await this.getPagBankOrder(order.paymentId);
        await this.applyGatewayStatus(order, this.mapPagBankOrderStatus(pagBankOrder));
      } catch (err) {
        this.logger.warn(`Unable to sync PagBank payment status for order ${order.id}: ${(err as Error).message}`);
      }
    }

    return {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus || null,
    };
  }

  async getPagBankOrder(orderId: string) {
    return this.pagBankRequest<PagBankOrder>(`/orders/${orderId}`, {
      method: 'GET',
    });
  }

  mapPagBankOrderStatus(order: PagBankOrder): GatewayPaymentStatus {
    const statuses = order.charges?.map((charge) => charge.status?.toUpperCase()).filter(Boolean) ?? [];
    if (statuses.includes('PAID')) return 'approved';
    if (statuses.includes('DECLINED') || statuses.includes('CANCELED') || statuses.includes('CANCELLED')) {
      return 'rejected';
    }
    if (statuses.includes('REFUNDED')) return 'refunded';
    return 'pending';
  }

  private async applyGatewayStatus(order: Order, status: GatewayPaymentStatus) {
    const shouldEmitNewOrder =
      status === 'approved' &&
      order.paymentStatus !== PaymentStatus.APPROVED &&
      order.status === OrderStatus.PENDING_PAYMENT;

    if (status === 'approved') {
      order.paymentStatus = PaymentStatus.APPROVED;
      order.status = OrderStatus.PAID;
    } else if (status === 'rejected') {
      order.paymentStatus = PaymentStatus.REJECTED;
    } else if (status === 'refunded') {
      order.paymentStatus = PaymentStatus.REFUNDED;
    } else {
      order.paymentStatus = PaymentStatus.PENDING;
    }

    await this.em.flush();

    if (shouldEmitNewOrder) {
      this.kitchenGateway.emitNewOrder(order);
    }
  }

  private getPagBankBaseUrl() {
    const override = this.configService.get<string>('PAGBANK_API_URL');
    if (override) return override.replace(/\/$/, '');

    const env = this.configService.get<string>('PAGBANK_ENV', 'sandbox').toLowerCase();
    return env === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';
  }

  private getPagBankSdkBaseUrl() {
    const override = this.configService.get<string>('PAGBANK_SDK_URL');
    if (override) return override.replace(/\/$/, '');

    const env = this.configService.get<string>('PAGBANK_ENV', 'sandbox').toLowerCase();
    return env === 'production'
      ? 'https://sdk.pagseguro.com'
      : 'https://sandbox.sdk.pagseguro.com';
  }

  private getPagBankAccessToken() {
    const token = this.configService.get<string>('PAGBANK_ACCESS_TOKEN');
    if (!token) {
      throw new BadRequestException('PagBank access token is not configured');
    }
    return token;
  }

  private async pagBankRequest<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
    const url = `${this.getPagBankBaseUrl()}${path}`;
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
    } catch (err) {
      await this.recordPagBankEvidence({
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        service: 'orders-api',
        environment: this.getPagBankEnvironment(),
        method: init.method,
        path,
        url,
        requestBody: init.body,
        error: {
          name: (err as Error).name,
          message: (err as Error).message,
        },
      });
      throw err;
    }

    const text = await response.text();
    const data = text ? this.parseJson(text) : null;

    await this.recordPagBankEvidence({
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      service: 'orders-api',
      environment: this.getPagBankEnvironment(),
      method: init.method,
      path,
      url,
      requestBody: init.body,
      responseStatus: response.status,
      responseBody: data,
    });

    if (!response.ok) {
      throw new BadRequestException(this.formatPagBankError(data, response.status));
    }

    return data as T;
  }

  private async pagBankSdkRequest<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
    const url = `${this.getPagBankSdkBaseUrl()}${path}`;
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
    } catch (err) {
      await this.recordPagBankEvidence({
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        service: 'sdk-api',
        environment: this.getPagBankEnvironment(),
        method: init.method,
        path,
        url,
        requestBody: init.body,
        error: {
          name: (err as Error).name,
          message: (err as Error).message,
        },
      });
      throw err;
    }

    const text = await response.text();
    const data = text ? this.parseJson(text) : null;

    await this.recordPagBankEvidence({
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      service: 'sdk-api',
      environment: this.getPagBankEnvironment(),
      method: init.method,
      path,
      url,
      requestBody: init.body,
      responseStatus: response.status,
      responseBody: data,
    });

    if (!response.ok) {
      throw new BadRequestException(this.formatPagBankError(data, response.status));
    }

    return data as T;
  }

  private parseJson(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private formatPagBankError(data: unknown, status: number) {
    if (typeof data === 'object' && data !== null) {
      const maybeError = data as {
        error_messages?: Array<{ code?: string; description?: string; parameter_name?: string }>;
        message?: string;
      };
      if (maybeError.error_messages?.length) {
        return maybeError.error_messages
          .map((error) => [error.code, error.parameter_name, error.description].filter(Boolean).join(' - '))
          .join('; ');
      }
      if (maybeError.message) return maybeError.message;
    }

    return `PagBank request failed with status ${status}`;
  }

  private buildPagBankCustomer(order: Order, email?: string, taxId?: string) {
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

  private buildPagBankPhones(phone?: string) {
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

  private buildPagBankItems(order: Order) {
    return [
      {
        reference_id: order.id,
        name: `Pedido #${order.orderNumber}`,
        quantity: 1,
        unit_amount: this.toCents(order.totalAmount),
      },
    ];
  }

  private buildPagBankShipping(order: Order) {
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

  private toCents(value: string | number) {
    return Math.round(Number(value) * 100);
  }

  private async getPagBankQrBase64(qrCode?: PagBankQrCode) {
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
    } catch (err) {
      await this.recordPagBankEvidence({
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        service: 'qrcode-api',
        environment: this.getPagBankEnvironment(),
        method: 'GET',
        path: base64Link.href,
        url: base64Link.href,
        error: {
          name: (err as Error).name,
          message: (err as Error).message,
        },
      });
      this.logger.warn(`Unable to fetch PagBank QR Code image: ${(err as Error).message}`);
      return '';
    }
  }

  private getPagBankEnvironment() {
    return this.configService.get<string>('PAGBANK_ENV', 'sandbox').toLowerCase();
  }

  private async recordPagBankEvidence(exchange: PagBankEvidenceExchange) {
    const file = this.getPagBankEvidenceFile();
    if (!file) return;

    try {
      await mkdir(path.dirname(file), { recursive: true });
      await appendFile(file, `${JSON.stringify(this.sanitizePagBankEvidence(exchange))}\n`);
    } catch (err) {
      this.logger.warn(`Unable to write PagBank evidence: ${(err as Error).message}`);
    }
  }

  private getPagBankEvidenceFile() {
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

  private resolveEvidencePath(value: string) {
    return path.isAbsolute(value) ? value : path.join(this.getWorkspaceRoot(), value);
  }

  private getWorkspaceRoot() {
    const cwd = process.cwd();
    if (path.basename(cwd) === 'api' && path.basename(path.dirname(cwd)) === 'apps') {
      return path.resolve(cwd, '../..');
    }
    return cwd;
  }

  private sanitizePagBankEvidence(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((entry) => this.sanitizePagBankEvidence(entry));
    if (typeof value === 'string') return this.sanitizePagBankString(value);
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        const normalizedKey = key.toLowerCase();

        if (normalizedKey.includes('authorization') || normalizedKey.includes('access_token') || normalizedKey === 'token') {
          return [key, '<redacted>'];
        }

        if (normalizedKey === 'encrypted' || normalizedKey === 'encryptedcard') {
          return [key, typeof entry === 'string' ? `<encrypted-card:${entry.length}:prefix:${entry.slice(0, 16)}>` : '<encrypted-card>'];
        }

        if (normalizedKey === 'session') {
          return [key, typeof entry === 'string' ? `<pagbank-3ds-session:${entry.length}>` : '<pagbank-3ds-session>'];
        }

        if ((normalizedKey === 'id' || normalizedKey === 'authenticationid') && typeof entry === 'string' && entry.startsWith('3DS_')) {
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

  private sanitizePagBankString(value: string) {
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

  private looksLikeBase64QrCode(value: string) {
    return value.length > 200 && /^[A-Za-z0-9+/=_-]+$/.test(value);
  }

  private maskDigits(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 4) return '<redacted-digits>';
    return `${digits.slice(0, 3)}${'*'.repeat(Math.max(0, digits.length - 5))}${digits.slice(-2)}`;
  }

  private maskEmail(value: string) {
    const [name, domain] = value.split('@');
    if (!name || !domain) return '<redacted-email>';
    const visible = name.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(3, name.length - visible.length))}@${domain}`;
  }

  private withoutUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
  }

  private normalizeBase64Image(value: string) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    return padding === 0 ? normalized : `${normalized}${'='.repeat(4 - padding)}`;
  }
}
