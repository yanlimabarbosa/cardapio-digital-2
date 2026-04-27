import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { Order } from '../../entities';
import { OrdersService } from '../orders/orders.service';
import { PaymentStatus } from '@cardapio/shared';
import { CreateCardPaymentDto } from './dto/create-card-payment.dto';

@Injectable()
export class PaymentsService {
  private mpClient: MercadoPagoConfig;
  private paymentApi: Payment;

  constructor(
    private readonly em: EntityManager,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {
    this.mpClient = new MercadoPagoConfig({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN')!,
    });
    this.paymentApi = new Payment(this.mpClient);
  }

  private getNotificationUrl(): string | undefined {
    const url = this.configService.get<string>('API_PUBLIC_URL');
    if (url && !url.includes('localhost')) {
      return `${url}/api/webhooks/mercadopago`;
    }
    return undefined;
  }

  async createPixPayment(orderId: string) {
    const order = await this.ordersService.findById(orderId);

    const result = await this.paymentApi.create({
      body: {
        transaction_amount: parseFloat(order.totalAmount),
        description: `Pedido #${order.id.slice(0, 8)}`,
        payment_method_id: 'pix',
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        payer: {
          email: order.customerEmail || 'cliente@bemcomer.com',
        },
        ...(this.getNotificationUrl() && { notification_url: this.getNotificationUrl() }),
        external_reference: order.id,
      },
      requestOptions: {
        idempotencyKey: `pix-${order.id}`,
      },
    });

    order.paymentId = String(result.id);
    order.paymentStatus = PaymentStatus.PENDING;
    await this.em.flush();

    return {
      paymentId: result.id,
      qrCode: result.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      ticketUrl: result.point_of_interaction?.transaction_data?.ticket_url,
      expiresAt: result.date_of_expiration,
    };
  }

  async createCardPayment(dto: CreateCardPaymentDto) {
    const order = await this.ordersService.findById(dto.orderId);

    const result = await this.paymentApi.create({
      body: {
        transaction_amount: parseFloat(order.totalAmount),
        description: `Pedido #${order.id.slice(0, 8)}`,
        payment_method_id: dto.paymentMethodId,
        token: dto.token,
        installments: dto.installments,
        payer: {
          email: dto.payerEmail,
          identification: {
            type: dto.identificationType,
            number: dto.identificationNumber,
          },
        },
        ...(this.getNotificationUrl() && { notification_url: this.getNotificationUrl() }),
        external_reference: order.id,
      },
      requestOptions: {
        idempotencyKey: `card-${order.id}`,
      },
    });

    order.paymentId = String(result.id);

    if (result.status === 'approved') {
      order.paymentStatus = PaymentStatus.APPROVED;
    } else if (result.status === 'rejected') {
      order.paymentStatus = PaymentStatus.REJECTED;
    } else {
      order.paymentStatus = PaymentStatus.PENDING;
    }

    await this.em.flush();

    return {
      status: result.status,
      statusDetail: result.status_detail,
      paymentId: result.id,
    };
  }

  async getPaymentStatus(orderId: string) {
    const order = await this.ordersService.findById(orderId);
    return {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus || null,
    };
  }

  getPaymentApi() {
    return this.paymentApi;
  }
}
