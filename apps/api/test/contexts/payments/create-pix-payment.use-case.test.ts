import assert from 'node:assert/strict';
import test from 'node:test';
import { PaymentMethod } from '@cardapio/shared';
import {
  CreatePixPaymentUseCase,
  PaymentOrderNotFoundError,
} from '../../../src/modules/payments/application/use-cases/create-pix-payment.use-case';
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
import type {
  ApplyPaymentGatewayStatusCommand,
  ApplyPaymentGatewayStatusResult,
  ApplyQueuedPaymentResultCommand,
  ApplyQueuedPaymentResultResult,
  FindPaymentOrderQuery,
  MarkPaymentPendingCommand,
  PaymentOrder,
  PaymentOrderRepository,
} from '../../../src/modules/payments/application/ports/payment-order.port';

test('creates Pix payment through the gateway and marks the order pending afterward', async (): Promise<void> => {
  const events: string[] = [];
  const order = createPaymentOrder();
  const paymentResult = createPixPaymentResult();
  const orders = new FakePaymentOrderRepository(events, order);
  const gateway = new FakePaymentGateway(events, paymentResult);
  const useCase = new CreatePixPaymentUseCase(orders, gateway);

  const result = await useCase.execute({
    orderId: 'order-1',
    payerEmail: 'cliente@example.com',
    payerTaxId: '12345678901',
  });

  assert.equal(result, paymentResult);
  assert.deepEqual(events, ['find:order-1', 'gateway:order-1', 'mark:PAY_PIX_1']);
  assert.deepEqual(gateway.pixInputs, [
    {
      order,
      payerEmail: 'cliente@example.com',
      payerTaxId: '12345678901',
    },
  ]);
  assert.deepEqual(orders.pendingMarks, [
    {
      orderId: 'order-1',
      paymentId: 'PAY_PIX_1',
    },
  ]);
});

test('rejects missing payment orders before calling PagBank', async (): Promise<void> => {
  const events: string[] = [];
  const orders = new FakePaymentOrderRepository(events, null);
  const gateway = new FakePaymentGateway(events, createPixPaymentResult());
  const useCase = new CreatePixPaymentUseCase(orders, gateway);

  await assert.rejects(
    () => useCase.execute({
      orderId: 'missing-order',
      payerEmail: 'cliente@example.com',
      payerTaxId: '12345678901',
    }),
    (error: unknown): boolean =>
      error instanceof PaymentOrderNotFoundError && error.message === 'Order missing-order not found',
  );

  assert.deepEqual(events, ['find:missing-order']);
  assert.deepEqual(gateway.pixInputs, []);
  assert.deepEqual(orders.pendingMarks, []);
});

test('does not mark the order pending when PagBank creation fails', async (): Promise<void> => {
  const events: string[] = [];
  const gatewayError = new Error('PagBank unavailable');
  const orders = new FakePaymentOrderRepository(events, createPaymentOrder());
  const gateway = new FakePaymentGateway(events, createPixPaymentResult(), gatewayError);
  const useCase = new CreatePixPaymentUseCase(orders, gateway);

  await assert.rejects(
    () => useCase.execute({
      orderId: 'order-1',
      payerEmail: 'cliente@example.com',
      payerTaxId: '12345678901',
    }),
    gatewayError,
  );

  assert.deepEqual(events, ['find:order-1', 'gateway:order-1']);
  assert.deepEqual(orders.pendingMarks, []);
});

class FakePaymentGateway implements PaymentGateway {
  public readonly pixInputs: CreatePixPaymentInput[] = [];

  public constructor(
    private readonly events: string[],
    private readonly pixResult: PixPaymentResult,
    private readonly pixError?: Error,
  ) {}

  public async createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    this.events.push(`gateway:${input.order.id}`);
    this.pixInputs.push(input);
    if (this.pixError) {
      throw this.pixError;
    }
    return this.pixResult;
  }

  public async create3dsSession(): Promise<Payment3dsSessionResult> {
    throw new Error('create3dsSession should not be called by CreatePixPaymentUseCase');
  }

  public async createCreditCardPayment(_input: CreateCreditCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error('createCreditCardPayment should not be called by CreatePixPaymentUseCase');
  }

  public async createDebitCardPayment(_input: CreateDebitCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error('createDebitCardPayment should not be called by CreatePixPaymentUseCase');
  }

  public async getPaymentStatus(_query: GetPaymentStatusQuery): Promise<PaymentGatewayStatusResult> {
    throw new Error('getPaymentStatus should not be called by CreatePixPaymentUseCase');
  }
}

class FakePaymentOrderRepository implements PaymentOrderRepository {
  public readonly pendingMarks: MarkPaymentPendingCommand[] = [];

  public constructor(
    private readonly events: string[],
    private readonly order: PaymentOrder | null,
  ) {}

  public async findById(query: FindPaymentOrderQuery): Promise<PaymentOrder | null> {
    this.events.push(`find:${query.orderId}`);
    return this.order;
  }

  public async markPaymentPending(command: MarkPaymentPendingCommand): Promise<PaymentOrder> {
    this.events.push(`mark:${command.paymentId}`);
    this.pendingMarks.push(command);

    if (!this.order) {
      throw new Error('markPaymentPending should not be called without an order');
    }

    return {
      ...this.order,
      paymentId: command.paymentId,
    };
  }

  public async applyGatewayStatus(
    _command: ApplyPaymentGatewayStatusCommand,
  ): Promise<ApplyPaymentGatewayStatusResult> {
    throw new Error('applyGatewayStatus should not be called by CreatePixPaymentUseCase');
  }

  public async applyQueuedPaymentResult(
    _command: ApplyQueuedPaymentResultCommand,
  ): Promise<ApplyQueuedPaymentResultResult> {
    throw new Error('applyQueuedPaymentResult should not be called by CreatePixPaymentUseCase');
  }
}

function createPixPaymentResult(): PixPaymentResult {
  return {
    paymentId: 'PAY_PIX_1',
    qrCode: '000201',
    qrCodeBase64: 'base64',
    expiresAt: '2026-05-07T12:30:00.000Z',
  };
}

function createPaymentOrder(): PaymentOrder {
  return {
    id: 'order-1',
    orderNumber: 42,
    customerName: 'Cliente Teste',
    customerPhone: '81999999999',
    customerEmail: 'cliente@example.com',
    totalAmount: '29.90',
    paymentMethod: PaymentMethod.PIX,
    items: [
      {
        productName: 'Quentinha P',
        quantity: 1,
        subtotal: 29.9,
      },
    ],
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
    updatedAt: new Date('2026-05-07T12:01:00.000Z'),
  };
}
