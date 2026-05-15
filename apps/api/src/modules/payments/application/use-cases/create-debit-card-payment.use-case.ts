import { PaymentMethod } from '@cardapio/shared';
import type { CardPaymentResult, PaymentGateway } from '../ports/payment-gateway.port';
import type {
  ApplyPaymentGatewayStatusResult,
  PaymentOrderRepository,
} from '../ports/payment-order.port';
import type { PaymentRealtimeNotifier } from '../ports/payment-realtime-notifier.port';

export type CreateDebitCardPaymentCommand = {
  readonly authenticationId: string;
  readonly cardholderName: string;
  readonly encryptedCard: string;
  readonly identificationNumber: string;
  readonly orderId: string;
  readonly payerEmail: string;
};

export type CreateDebitCardPaymentResult = CardPaymentResult;

export class DebitCardPaymentOrderNotFoundError extends Error {
  public constructor(orderId: string) {
    super(`Order ${orderId} not found`);
  }
}

export class DebitCardPaymentInputError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export class CreateDebitCardPaymentUseCase {
  public constructor(
    private readonly paymentOrders: PaymentOrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentRealtimeNotifier: PaymentRealtimeNotifier,
  ) {}

  public async execute(command: CreateDebitCardPaymentCommand): Promise<CreateDebitCardPaymentResult> {
    if (!command.encryptedCard) {
      throw new DebitCardPaymentInputError('PagBank encrypted card is required');
    }
    if (!command.authenticationId) {
      throw new DebitCardPaymentInputError('PagBank 3DS authentication id is required');
    }
    if (!command.cardholderName.trim()) {
      throw new DebitCardPaymentInputError('PagBank cardholder name is required');
    }

    const order = await this.paymentOrders.findById({ orderId: command.orderId });

    if (!order) {
      throw new DebitCardPaymentOrderNotFoundError(command.orderId);
    }

    if (order.paymentMethod !== PaymentMethod.DEBIT_CARD) {
      throw new DebitCardPaymentInputError('Pedido nao foi criado para pagamento no debito');
    }

    const payment = await this.paymentGateway.createDebitCardPayment({
      order,
      authenticationId: command.authenticationId,
      cardholderName: command.cardholderName.trim(),
      encryptedCard: command.encryptedCard,
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
