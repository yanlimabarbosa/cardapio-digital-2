import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import {
  CardPaymentInputError,
  CardPaymentOrderNotFoundError,
  CreateCardPaymentUseCase,
} from '../../../src/modules/payments/application/use-cases/create-card-payment.use-case';
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
  PaymentNewOrderNotification,
  PaymentOrder,
  PaymentOrderRepository,
} from '../../../src/modules/payments/application/ports/payment-order.port';
import type { PaymentRealtimeNotifier } from '../../../src/modules/payments/application/ports/payment-realtime-notifier.port';

test('creates credit card payment through the gateway and applies the returned status', async (): Promise<void> => {
  const events: string[] = [];
  const order = createPaymentOrder();
  const notification = createPaymentNotification();
  const paymentResult = createCardPaymentResult();
  const orders = new FakePaymentOrderRepository(events, order, {
    order: {
      ...order,
      paymentId: paymentResult.paymentId,
      paymentStatus: PaymentStatus.APPROVED,
      status: OrderStatus.PAID,
    },
    newOrderNotification: notification,
  });
  const gateway = new FakePaymentGateway(events, paymentResult);
  const notifier = new FakePaymentRealtimeNotifier(events);
  const useCase = new CreateCardPaymentUseCase(orders, gateway, notifier);

  const result = await useCase.execute(createCommand());

  assert.equal(result, paymentResult);
  assert.deepEqual(events, ['find:order-1', 'gateway:order-1', 'apply:PAY_CARD_1', 'notify:order-1']);
  assert.deepEqual(gateway.cardInputs, [
    {
      order,
      cardholderName: 'JOSE DA SILVA',
      encryptedCard: 'encrypted-card',
      installments: 2,
      payerEmail: 'cliente@example.com',
      payerTaxId: '12345678901',
    },
  ]);
  assert.deepEqual(orders.gatewayStatusCommands, [
    {
      orderId: 'order-1',
      paymentId: 'PAY_CARD_1',
      status: 'approved',
    },
  ]);
  assert.deepEqual(notifier.notifications, [notification]);
});

test('rejects missing encrypted card before loading the order', async (): Promise<void> => {
  const events: string[] = [];
  const orders = new FakePaymentOrderRepository(events, createPaymentOrder());
  const gateway = new FakePaymentGateway(events, createCardPaymentResult());
  const notifier = new FakePaymentRealtimeNotifier(events);
  const useCase = new CreateCardPaymentUseCase(orders, gateway, notifier);

  await assert.rejects(
    () => useCase.execute({
      ...createCommand(),
      encryptedCard: '',
    }),
    (error: unknown): boolean =>
      error instanceof CardPaymentInputError && error.message === 'PagBank encrypted card is required',
  );

  assert.deepEqual(events, []);
  assert.deepEqual(gateway.cardInputs, []);
  assert.deepEqual(orders.gatewayStatusCommands, []);
});

test('rejects missing payment orders before calling PagBank', async (): Promise<void> => {
  const events: string[] = [];
  const orders = new FakePaymentOrderRepository(events, null);
  const gateway = new FakePaymentGateway(events, createCardPaymentResult());
  const notifier = new FakePaymentRealtimeNotifier(events);
  const useCase = new CreateCardPaymentUseCase(orders, gateway, notifier);

  await assert.rejects(
    () => useCase.execute(createCommand()),
    (error: unknown): boolean =>
      error instanceof CardPaymentOrderNotFoundError && error.message === 'Order order-1 not found',
  );

  assert.deepEqual(events, ['find:order-1']);
  assert.deepEqual(gateway.cardInputs, []);
  assert.deepEqual(orders.gatewayStatusCommands, []);
});

test('does not apply gateway status when PagBank creation fails', async (): Promise<void> => {
  const events: string[] = [];
  const gatewayError = new Error('PagBank unavailable');
  const orders = new FakePaymentOrderRepository(events, createPaymentOrder());
  const gateway = new FakePaymentGateway(events, createCardPaymentResult(), gatewayError);
  const notifier = new FakePaymentRealtimeNotifier(events);
  const useCase = new CreateCardPaymentUseCase(orders, gateway, notifier);

  await assert.rejects(() => useCase.execute(createCommand()), gatewayError);

  assert.deepEqual(events, ['find:order-1', 'gateway:order-1']);
  assert.deepEqual(orders.gatewayStatusCommands, []);
  assert.deepEqual(notifier.notifications, []);
});

class FakePaymentGateway implements PaymentGateway {
  public readonly cardInputs: CreateCreditCardPaymentInput[] = [];

  public constructor(
    private readonly events: string[],
    private readonly cardResult: CardPaymentResult,
    private readonly cardError?: Error,
  ) {}

  public async createCreditCardPayment(input: CreateCreditCardPaymentInput): Promise<CardPaymentResult> {
    this.events.push(`gateway:${input.order.id}`);
    this.cardInputs.push(input);
    if (this.cardError) {
      throw this.cardError;
    }
    return this.cardResult;
  }

  public async create3dsSession(): Promise<Payment3dsSessionResult> {
    throw new Error('create3dsSession should not be called by CreateCardPaymentUseCase');
  }

  public async createDebitCardPayment(_input: CreateDebitCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error('createDebitCardPayment should not be called by CreateCardPaymentUseCase');
  }

  public async createPixPayment(_input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    throw new Error('createPixPayment should not be called by CreateCardPaymentUseCase');
  }

  public async getPaymentStatus(_query: GetPaymentStatusQuery): Promise<PaymentGatewayStatusResult> {
    throw new Error('getPaymentStatus should not be called by CreateCardPaymentUseCase');
  }
}

class FakePaymentOrderRepository implements PaymentOrderRepository {
  public readonly gatewayStatusCommands: ApplyPaymentGatewayStatusCommand[] = [];

  public constructor(
    private readonly events: string[],
    private readonly order: PaymentOrder | null,
    private readonly applyResult?: ApplyPaymentGatewayStatusResult,
  ) {}

  public async findById(query: FindPaymentOrderQuery): Promise<PaymentOrder | null> {
    this.events.push(`find:${query.orderId}`);
    return this.order;
  }

  public async markPaymentPending(_command: MarkPaymentPendingCommand): Promise<PaymentOrder> {
    throw new Error('markPaymentPending should not be called by CreateCardPaymentUseCase');
  }

  public async applyGatewayStatus(command: ApplyPaymentGatewayStatusCommand): Promise<ApplyPaymentGatewayStatusResult> {
    this.events.push(`apply:${command.paymentId ?? 'without-payment-id'}`);
    this.gatewayStatusCommands.push(command);

    if (this.applyResult) {
      return this.applyResult;
    }

    if (!this.order) {
      throw new Error('applyGatewayStatus should not be called without an order');
    }

    return {
      order: this.order,
      newOrderNotification: null,
    };
  }

  public async applyQueuedPaymentResult(
    _command: ApplyQueuedPaymentResultCommand,
  ): Promise<ApplyQueuedPaymentResultResult> {
    throw new Error('applyQueuedPaymentResult should not be called by CreateCardPaymentUseCase');
  }
}

class FakePaymentRealtimeNotifier implements PaymentRealtimeNotifier {
  public readonly notifications: PaymentNewOrderNotification[] = [];

  public constructor(private readonly events: string[]) {}

  public async newOrderPaid(notification: PaymentNewOrderNotification): Promise<void> {
    this.events.push(`notify:${notification.id}`);
    this.notifications.push(notification);
  }
}

function createCommand(): {
  readonly cardholderName: string;
  readonly encryptedCard: string;
  readonly identificationNumber: string;
  readonly installments: number;
  readonly orderId: string;
  readonly payerEmail: string;
} {
  return {
    orderId: 'order-1',
    cardholderName: 'JOSE DA SILVA',
    encryptedCard: 'encrypted-card',
    installments: 2,
    payerEmail: 'cliente@example.com',
    identificationNumber: '12345678901',
  };
}

function createCardPaymentResult(): CardPaymentResult {
  return {
    paymentId: 'PAY_CARD_1',
    status: 'approved',
    statusDetail: 'Aprovado',
  };
}

function createPaymentNotification(): PaymentNewOrderNotification {
  return {
    id: 'order-1',
    orderNumber: 42,
    customerName: 'Cliente Teste',
    status: OrderStatus.PAID,
    totalAmount: 29.9,
    items: [
      {
        productName: 'Quentinha P',
        quantity: 1,
        subtotal: 29.9,
      },
    ],
    createdAt: '2026-05-07T12:00:00.000Z',
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
    paymentMethod: PaymentMethod.CREDIT_CARD,
    status: OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
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
