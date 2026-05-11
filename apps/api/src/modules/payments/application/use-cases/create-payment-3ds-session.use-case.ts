import type { Payment3dsSessionResult, PaymentGateway } from '../ports/payment-gateway.port';

export type CreatePayment3dsSessionResult = Payment3dsSessionResult;

export class CreatePayment3dsSessionUseCase {
  public constructor(private readonly paymentGateway: PaymentGateway) {}

  public execute(): Promise<CreatePayment3dsSessionResult> {
    return this.paymentGateway.create3dsSession();
  }
}
