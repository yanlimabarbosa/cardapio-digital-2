import type { PaymentGateway, PixPaymentResult } from '../ports/payment-gateway.port';
import type { PaymentOrderRepository } from '../ports/payment-order.port';

export type CreatePixPaymentCommand = {
  readonly orderId: string;
  readonly payerEmail: string;
  readonly payerTaxId: string;
};

export type CreatePixPaymentResult = PixPaymentResult;

export class PaymentOrderNotFoundError extends Error {
  public constructor(orderId: string) {
    super(`Order ${orderId} not found`);
  }
}

export class CreatePixPaymentUseCase {
  public constructor(
    private readonly paymentOrders: PaymentOrderRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  public async execute(command: CreatePixPaymentCommand): Promise<CreatePixPaymentResult> {
    const order = await this.paymentOrders.findById({ orderId: command.orderId });

    if (!order) {
      throw new PaymentOrderNotFoundError(command.orderId);
    }

    const payment = await this.paymentGateway.createPixPayment({
      order,
      payerEmail: command.payerEmail,
      payerTaxId: command.payerTaxId,
    });

    await this.paymentOrders.markPaymentPending({
      orderId: order.id,
      paymentId: payment.paymentId,
    });

    return payment;
  }
}
