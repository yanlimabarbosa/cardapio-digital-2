import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod } from '@cardapio/shared';
import {
  ChangeOrderStatusUseCase,
  InvalidOrderStatusTransitionError,
  OrderNotFoundError,
} from '../../../src/modules/orders/application/use-cases/change-order-status.use-case';
import type { OrderRealtimeNotifier } from '../../../src/modules/orders/application/ports/order-realtime-notifier.port';
import type {
  CreditDeliveredOrderLoyaltyCommand,
  CreditDeliveredOrderLoyaltyResult,
  FindOrderForStatusChangeQuery,
  GetLoyaltyPointsPerRealQuery,
  GetOrderStatusChangeResultQuery,
  OrderStatusChangePersistenceResult,
  OrderStatusChangeTarget,
  OrderStatusRepository,
  SaveOrderStatusChangeCommand,
} from '../../../src/modules/orders/application/ports/order-status-repository.port';
import type { OrderReadModel } from '../../../src/modules/orders/application/read-models/order.read-model';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';

type Harness = {
  readonly calls: string[];
  readonly notifier: FakeOrderRealtimeNotifier;
  readonly orders: FakeOrderStatusRepository;
  readonly unitOfWork: FakeUnitOfWork;
  readonly useCase: ChangeOrderStatusUseCase;
};

test('changes order status inside a unit of work and notifies after commit', async (): Promise<void> => {
  const harness = createHarness({
    target: {
      ...paidOrderTarget,
      status: OrderStatus.PAID,
    },
  });

  const result = await harness.useCase.execute({ id: 'order-1', status: OrderStatus.PREPARING });

  assert.equal(result.status, OrderStatus.PREPARING);
  assert.deepEqual(harness.calls, [
    'uow:start',
    'orders:find:order-1',
    'orders:save:order-1:preparing',
    'orders:result:order-1',
    'uow:commit',
    'notifier:status:order-1:preparing',
  ]);
});

test('rejects missing orders without saving or notifying', async (): Promise<void> => {
  const harness = createHarness({ target: null });

  await assert.rejects(
    () => harness.useCase.execute({ id: 'missing-order', status: OrderStatus.PREPARING }),
    OrderNotFoundError,
  );

  assert.deepEqual(harness.calls, [
    'uow:start',
    'orders:find:missing-order',
    'uow:rollback',
  ]);
});

test('rejects invalid status transitions before saving or notifying', async (): Promise<void> => {
  const harness = createHarness({
    target: {
      ...paidOrderTarget,
      status: OrderStatus.PAID,
    },
  });

  await assert.rejects(
    () => harness.useCase.execute({ id: 'order-1', status: OrderStatus.DELIVERED }),
    InvalidOrderStatusTransitionError,
  );

  assert.deepEqual(harness.calls, [
    'uow:start',
    'orders:find:order-1',
    'uow:rollback',
  ]);
});

test('credits loyalty points for delivered orders from registered customers', async (): Promise<void> => {
  const harness = createHarness({
    loyaltyPointsPerReal: 2,
    target: {
      ...paidOrderTarget,
      status: OrderStatus.OUT_FOR_DELIVERY,
      totalCents: 12345,
      deliveryFeeCents: 345,
      customer: {
        id: 'customer-1',
        phone: '81999999999',
        loyaltyPoints: 10,
        isRegistered: true,
      },
    },
  });

  await harness.useCase.execute({ id: 'order-1', status: OrderStatus.DELIVERED });

  assert.deepEqual(harness.orders.loyaltyCredits, [
    {
      context: fakeTransactionContext,
      orderId: 'order-1',
      orderNumber: 42,
      customerId: 'customer-1',
      customerPhone: '81999999999',
      pointsEarned: 240,
    },
  ]);
  assert.deepEqual(harness.calls, [
    'uow:start',
    'orders:find:order-1',
    'orders:save:order-1:delivered',
    'orders:settings',
    'orders:loyalty:240',
    'orders:result:order-1',
    'uow:commit',
    'notifier:status:order-1:delivered',
  ]);
});

test('does not credit loyalty for unregistered delivered customers', async (): Promise<void> => {
  const harness = createHarness({
    loyaltyPointsPerReal: 2,
    target: {
      ...paidOrderTarget,
      status: OrderStatus.OUT_FOR_DELIVERY,
      customer: {
        id: 'customer-1',
        phone: '81999999999',
        loyaltyPoints: 10,
        isRegistered: false,
      },
    },
  });

  await harness.useCase.execute({ id: 'order-1', status: OrderStatus.DELIVERED });

  assert.deepEqual(harness.orders.loyaltyCredits, []);
  assert.deepEqual(harness.calls, [
    'uow:start',
    'orders:find:order-1',
    'orders:save:order-1:delivered',
    'orders:result:order-1',
    'uow:commit',
    'notifier:status:order-1:delivered',
  ]);
});

function createHarness(options: {
  readonly loyaltyPointsPerReal?: number;
  readonly target: OrderStatusChangeTarget | null;
}): Harness {
  const calls: string[] = [];
  const unitOfWork = new FakeUnitOfWork(calls);
  const orders = new FakeOrderStatusRepository(calls, options.target, options.loyaltyPointsPerReal ?? 0);
  const notifier = new FakeOrderRealtimeNotifier(calls);
  const useCase = new ChangeOrderStatusUseCase(unitOfWork, orders, notifier);

  return {
    calls,
    unitOfWork,
    orders,
    notifier,
    useCase,
  };
}

class FakeUnitOfWork implements UnitOfWork {
  public constructor(private readonly calls: string[]) {}

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.calls.push('uow:start');

    try {
      const result = await work(fakeTransactionContext);
      this.calls.push('uow:commit');
      return result;
    } catch (error: unknown) {
      this.calls.push('uow:rollback');
      throw error;
    }
  }
}

class FakeOrderStatusRepository implements OrderStatusRepository {
  public readonly loyaltyCredits: CreditDeliveredOrderLoyaltyCommand[] = [];
  private savedStatus: OrderStatus = sampleOrder.status ?? OrderStatus.PREPARING;

  public constructor(
    private readonly calls: string[],
    private readonly target: OrderStatusChangeTarget | null,
    private readonly loyaltyPointsPerReal: number,
  ) {}

  public async findForStatusChange(query: FindOrderForStatusChangeQuery): Promise<OrderStatusChangeTarget | null> {
    assert.equal(query.context, fakeTransactionContext);
    this.calls.push(`orders:find:${query.id}`);
    return this.target;
  }

  public async saveStatus(command: SaveOrderStatusChangeCommand): Promise<void> {
    assert.equal(command.context, fakeTransactionContext);
    this.savedStatus = command.status;
    this.calls.push(`orders:save:${command.id}:${command.status}`);
  }

  public async getStatusChangeResult(
    query: GetOrderStatusChangeResultQuery,
  ): Promise<OrderStatusChangePersistenceResult> {
    assert.equal(query.context, fakeTransactionContext);
    this.calls.push(`orders:result:${query.id}`);

    return {
      order: {
        ...sampleOrder,
        id: query.id,
        status: this.savedStatus,
      },
      notification: {
        id: query.id,
        status: this.savedStatus,
        updatedAt: sampleOrder.updatedAt,
      },
    };
  }

  public async getLoyaltyPointsPerReal(query: GetLoyaltyPointsPerRealQuery): Promise<number> {
    assert.equal(query.context, fakeTransactionContext);
    this.calls.push('orders:settings');
    return this.loyaltyPointsPerReal;
  }

  public async creditDeliveredOrderLoyalty(
    command: CreditDeliveredOrderLoyaltyCommand,
  ): Promise<CreditDeliveredOrderLoyaltyResult> {
    assert.equal(command.context, fakeTransactionContext);
    this.calls.push(`orders:loyalty:${command.pointsEarned}`);
    this.loyaltyCredits.push(command);

    return { credited: true, pointsEarned: command.pointsEarned };
  }
}

class FakeOrderRealtimeNotifier implements OrderRealtimeNotifier {
  public constructor(private readonly calls: string[]) {}

  public async orderStatusChanged(notification: { readonly id: string; readonly status: OrderStatus }): Promise<void> {
    this.calls.push(`notifier:status:${notification.id}:${notification.status}`);
  }
}

const fakeTransactionContext: TransactionContext = {
  contextName: 'fake',
};

const paidOrderTarget: OrderStatusChangeTarget = {
  id: 'order-1',
  orderNumber: 42,
  status: OrderStatus.PAID,
  totalCents: 1000,
  deliveryFeeCents: 0,
  customer: null,
};

const sampleOrder: OrderReadModel = {
  id: 'order-1',
  orderNumber: 42,
  customerName: 'Cliente Teste',
  customerPhone: '81999999999',
  status: OrderStatus.PREPARING,
  totalAmount: 10,
  couponCode: null,
  discountAmount: null,
  deliveryFee: null,
  paymentMethod: PaymentMethod.PIX,
  deliveryType: 'pickup',
  scheduledFor: null,
  items: [],
  createdAt: '2026-05-06T12:00:00.000Z',
  updatedAt: '2026-05-06T12:05:00.000Z',
};
