import type { CardPaymentResult, PaymentGateway } from '../ports/payment-gateway.port';
import type {
  ApplyPaymentGatewayStatusResult,
  PaymentOrderRepository,
} from '../ports/payment-order.port';
import type { PaymentRealtimeNotifier } from '../ports/payment-realtime-notifier.port';

export type CreateCardPaymentCommand = {
  readonly encryptedCard: string;
  readonly identificationNumber: string;
  readonly installments: number;
  readonly orderId: string;
  readonly payerEmail: string;
};

export type CreateCardPaymentResult = CardPaymentResult;

export class CardPaymentOrderNotFoundError extends Error {
  public constructor(orderId: string) {
    super(`Order ${orderId} not found`);
  }
}

export class CardPaymentInputError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export class CreateCardPaymentUseCase {
  public constructor(
    private readonly paymentOrders: PaymentOrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentRealtimeNotifier: PaymentRealtimeNotifier,
  ) {}

  public async execute(command: CreateCardPaymentCommand): Promise<CreateCardPaymentResult> {
    if (!command.encryptedCard) {
      throw new CardPaymentInputError('PagBank encrypted card is required');
    }

    const order = await this.paymentOrders.findById({ orderId: command.orderId });

    if (!order) {
      throw new CardPaymentOrderNotFoundError(command.orderId);
    }

    const payment = await this.paymentGateway.createCreditCardPayment({
      order,
      encryptedCard: command.encryptedCard,
      installments: command.installments,
      payerEmail: command.payerEmail,
      payerTaxId: command.identificationNumber,
    });

    await this.emitNewOrderIfNeeded(
      await this.paymentOrders.applyGatewayStatus({
        orderId: order.id,
        paymentId: payment.paymentId,
        status: payment.status,
      }),
    );

    return payment;
  }

  private async emitNewOrderIfNeeded(result: ApplyPaymentGatewayStatusResult): Promise<void> {
    if (result.newOrderNotification) {
      await this.paymentRealtimeNotifier.newOrderPaid(result.newOrderNotification);
    }
  }
}
