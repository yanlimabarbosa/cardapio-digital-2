import assert from 'node:assert/strict';
import test from 'node:test';
import { CreatePayment3dsSessionUseCase } from '../../../src/modules/payments/application/use-cases/create-payment-3ds-session.use-case';
import type {
  CardPaymentResult,
  CreateCreditCardPaymentInput,
  CreateDebitCardPaymentInput,
  CreatePixPaymentInput,
  GetPaymentStatusQuery,
  Payment3dsSessionResult,
  PaymentGateway,
  PaymentGatewayStatusResult,
  PixPaymentResult,
} from '../../../src/modules/payments/application/ports/payment-gateway.port';

test('creates a 3DS session through the payment gateway', async (): Promise<void> => {
  const sessionResult = createSessionResult();
  const gateway = new FakePaymentGateway(sessionResult);
  const useCase = new CreatePayment3dsSessionUseCase(gateway);

  const result = await useCase.execute();

  assert.equal(result, sessionResult);
  assert.equal(gateway.create3dsSessionCalls, 1);
});

test('propagates gateway failures without converting them', async (): Promise<void> => {
  const gatewayError = new Error('PagBank SDK unavailable');
  const gateway = new FakePaymentGateway(createSessionResult(), gatewayError);
  const useCase = new CreatePayment3dsSessionUseCase(gateway);

  await assert.rejects(() => useCase.execute(), gatewayError);
  assert.equal(gateway.create3dsSessionCalls, 1);
});

class FakePaymentGateway implements PaymentGateway {
  public create3dsSessionCalls = 0;

  public constructor(
    private readonly sessionResult: Payment3dsSessionResult,
    private readonly sessionError?: Error,
  ) {}

  public async create3dsSession(): Promise<Payment3dsSessionResult> {
    this.create3dsSessionCalls += 1;
    if (this.sessionError) {
      throw this.sessionError;
    }
    return this.sessionResult;
  }

  public async createCreditCardPayment(_input: CreateCreditCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error('createCreditCardPayment should not be called by CreatePayment3dsSessionUseCase');
  }

  public async createDebitCardPayment(_input: CreateDebitCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error('createDebitCardPayment should not be called by CreatePayment3dsSessionUseCase');
  }

  public async createPixPayment(_input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    throw new Error('createPixPayment should not be called by CreatePayment3dsSessionUseCase');
  }

  public async getPaymentStatus(_query: GetPaymentStatusQuery): Promise<PaymentGatewayStatusResult> {
    throw new Error('getPaymentStatus should not be called by CreatePayment3dsSessionUseCase');
  }
}

function createSessionResult(): Payment3dsSessionResult {
  return {
    session: '3ds-session',
    expiresAt: 1778173200,
  };
}
