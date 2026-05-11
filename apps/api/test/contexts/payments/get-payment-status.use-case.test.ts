import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import {
  GetPaymentStatusUseCase,
  PaymentStatusOrderNotFoundError,
} from '../../../src/modules/payments/application/use-cases/get-payment-status.use-case';
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
import type {
  PaymentStatusSyncFailureReport,
  PaymentStatusSyncReporter,
} from '../../../src/modules/payments/application/ports/payment-status-sync-reporter.port';

test('returns local payment status when there is no external payment id', async (): Promise<void> => {
  const order = createPaymentOrder({ paymentId: undefined, paymentStatus: PaymentStatus.PENDING });
  const orders = new FakePaymentOrderRepository(order);
  const gateway = new FakePaymentGateway();
  const notifier = new FakePaymentRealtimeNotifier();
  const reporter = new FakePaymentStatusSyncReporter();
  const useCase = new GetPaymentStatusUseCase(orders, gateway, notifier, reporter);

  const result = await useCase.execute({ orderId: 'order-1' });

  assert.deepEqual(result, {
    orderId: 'order-1',
    orderStatus: OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
  });
  assert.deepEqual(gateway.statusQueries, []);
  assert.deepEqual(orders.gatewayStatusCommands, []);
  assert.deepEqual(reporter.failures, []);
});

test('syncs pending gateway status and emits paid notifications after applying the status', async (): Promise<void> => {
  const order = createPaymentOrder({ paymentId: 'ORDE_1', paymentStatus: PaymentStatus.PENDING });
  const paidOrder = createPaymentOrder({
    paymentId: 'ORDE_1',
    paymentStatus: PaymentStatus.APPROVED,
    status: OrderStatus.PAID,
  });
  const notification = createPaymentNotification();
  const orders = new FakePaymentOrderRepository(order, {
    order: paidOrder,
    newOrderNotification: notification,
  });
  const gateway = new FakePaymentGateway({
    externalId: 'ORDE_1',
    referenceId: 'order-1',
    status: 'approved',
  });
  const notifier = new FakePaymentRealtimeNotifier();
  const reporter = new FakePaymentStatusSyncReporter();
  const useCase = new GetPaymentStatusUseCase(orders, gateway, notifier, reporter);

  const result = await useCase.execute({ orderId: 'order-1' });

  assert.deepEqual(gateway.statusQueries, [{ externalId: 'ORDE_1' }]);
  assert.deepEqual(orders.gatewayStatusCommands, [
    {
      orderId: 'order-1',
      status: 'approved',
    },
  ]);
  assert.deepEqual(notifier.notifications, [notification]);
  assert.deepEqual(reporter.failures, []);
  assert.deepEqual(result, {
    orderId: 'order-1',
    orderStatus: OrderStatus.PAID,
    paymentStatus: PaymentStatus.APPROVED,
  });
});

test('keeps the local status and reports gateway sync failures', async (): Promise<void> => {
  const gatewayError = new Error('PagBank unavailable');
  const order = createPaymentOrder({ paymentId: 'ORDE_1', paymentStatus: PaymentStatus.PENDING });
  const orders = new FakePaymentOrderRepository(order);
  const gateway = new FakePaymentGateway(undefined, gatewayError);
  const notifier = new FakePaymentRealtimeNotifier();
  const reporter = new FakePaymentStatusSyncReporter();
  const useCase = new GetPaymentStatusUseCase(orders, gateway, notifier, reporter);

  const result = await useCase.execute({ orderId: 'order-1' });

  assert.deepEqual(gateway.statusQueries, [{ externalId: 'ORDE_1' }]);
  assert.deepEqual(orders.gatewayStatusCommands, []);
  assert.deepEqual(notifier.notifications, []);
  assert.deepEqual(reporter.failures, [
    {
      orderId: 'order-1',
      errorMessage: 'PagBank unavailable',
    },
  ]);
  assert.deepEqual(result, {
    orderId: 'order-1',
    orderStatus: OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
  });
});

test('rejects missing payment orders before checking the gateway', async (): Promise<void> => {
  const orders = new FakePaymentOrderRepository(null);
  const gateway = new FakePaymentGateway();
  const notifier = new FakePaymentRealtimeNotifier();
  const reporter = new FakePaymentStatusSyncReporter();
  const useCase = new GetPaymentStatusUseCase(orders, gateway, notifier, reporter);

  await assert.rejects(
    () => useCase.execute({ orderId: 'missing-order' }),
    (error: unknown): boolean =>
      error instanceof PaymentStatusOrderNotFoundError && error.message === 'Order missing-order not found',
  );

  assert.deepEqual(gateway.statusQueries, []);
  assert.deepEqual(reporter.failures, []);
});

class FakePaymentGateway implements PaymentGateway {
  public readonly statusQueries: GetPaymentStatusQuery[] = [];

  public constructor(
    private readonly statusResult?: PaymentGatewayStatusResult,
    private readonly statusError?: Error,
  ) {}

  public async create3dsSession(): Promise<Payment3dsSessionResult> {
    throw new Error('create3dsSession should not be called by GetPaymentStatusUseCase');
  }

  public async createCreditCardPayment(_input: CreateCreditCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error('createCreditCardPayment should not be called by GetPaymentStatusUseCase');
  }

  public async createDebitCardPayment(_input: CreateDebitCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error('createDebitCardPayment should not be called by GetPaymentStatusUseCase');
  }

  public async createPixPayment(_input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    throw new Error('createPixPayment should not be called by GetPaymentStatusUseCase');
  }

  public async getPaymentStatus(query: GetPaymentStatusQuery): Promise<PaymentGatewayStatusResult> {
    this.statusQueries.push(query);
    if (this.statusError) {
      throw this.statusError;
    }
    return this.statusResult ?? {
      externalId: query.externalId,
      status: 'pending',
    };
  }
}

class FakePaymentOrderRepository implements PaymentOrderRepository {
  public readonly gatewayStatusCommands: ApplyPaymentGatewayStatusCommand[] = [];

  public constructor(
    private readonly order: PaymentOrder | null,
    private readonly applyResult?: ApplyPaymentGatewayStatusResult,
  ) {}

  public async findById(_query: FindPaymentOrderQuery): Promise<PaymentOrder | null> {
    return this.order;
  }

  public async markPaymentPending(_command: MarkPaymentPendingCommand): Promise<PaymentOrder> {
    throw new Error('markPaymentPending should not be called by GetPaymentStatusUseCase');
  }

  public async applyGatewayStatus(command: ApplyPaymentGatewayStatusCommand): Promise<ApplyPaymentGatewayStatusResult> {
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
    throw new Error('applyQueuedPaymentResult should not be called by GetPaymentStatusUseCase');
  }
}

class FakePaymentRealtimeNotifier implements PaymentRealtimeNotifier {
  public readonly notifications: PaymentNewOrderNotification[] = [];

  public async newOrderPaid(notification: PaymentNewOrderNotification): Promise<void> {
    this.notifications.push(notification);
  }
}

class FakePaymentStatusSyncReporter implements PaymentStatusSyncReporter {
  public readonly failures: PaymentStatusSyncFailureReport[] = [];

  public async syncFailed(report: PaymentStatusSyncFailureReport): Promise<void> {
    this.failures.push(report);
  }
}

function createPaymentOrder(options: {
  readonly paymentId?: string;
  readonly paymentStatus?: PaymentStatus;
  readonly status?: OrderStatus;
} = {}): PaymentOrder {
  return {
    id: 'order-1',
    orderNumber: 42,
    customerName: 'Cliente Teste',
    customerPhone: '81999999999',
    customerEmail: 'cliente@example.com',
    totalAmount: '29.90',
    paymentId: options.paymentId,
    paymentMethod: PaymentMethod.PIX,
    paymentStatus: options.paymentStatus,
    status: options.status ?? OrderStatus.PENDING_PAYMENT,
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
