import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import type { Clock } from '../../../src/shared/application/clock/clock.port';
import type {
  AdminOrderReadRepository,
  ListAdminOrdersReadQuery,
} from '../../../src/modules/admin/application/ports/admin-order.read-repository.port';
import type { AdminOrderReadModel } from '../../../src/modules/admin/application/read-models/admin-order.read-model';
import { ListAdminOrdersUseCase } from '../../../src/modules/admin/application/use-cases/list-admin-orders.use-case';

test('lists active admin orders from the start of the current day', async (): Promise<void> => {
  const orders = new FakeAdminOrderReadRepository([]);
  const clock = new FakeClock(new Date('2026-05-07T14:15:00.000Z'));
  const useCase = new ListAdminOrdersUseCase(orders, clock);

  const result = await useCase.execute();

  assert.deepEqual(result, []);
  assert.equal(clock.nowCalls, 1);
  assert.deepEqual(orders.listCalls, [
    {
      mode: 'active',
      activeStatuses: [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.OUT_FOR_DELIVERY,
      ],
      createdAtFrom: new Date('2026-05-07T03:00:00.000Z'),
      limit: 200,
    },
  ]);
});

test('lists admin orders by explicit status without applying the active window', async (): Promise<void> => {
  const order = createOrderReadModel('order-1');
  const orders = new FakeAdminOrderReadRepository([order]);
  const clock = new FakeClock(new Date('2026-05-07T14:15:00.000Z'));
  const useCase = new ListAdminOrdersUseCase(orders, clock);

  const result = await useCase.execute({ status: 'delivered' });

  assert.deepEqual(result, [order]);
  assert.equal(clock.nowCalls, 0);
  assert.deepEqual(orders.listCalls, [{ mode: 'status', status: 'delivered', limit: 200 }]);
});

function createOrderReadModel(id: string): AdminOrderReadModel {
  return {
    id,
    orderNumber: 42,
    customerName: 'Yan',
    customerPhone: '81999999999',
    status: OrderStatus.DELIVERED,
    totalAmount: 25,
    deliveryFee: null,
    paymentMethod: PaymentMethod.PIX,
    paymentStatus: PaymentStatus.APPROVED,
    deliveryType: 'pickup',
    scheduledFor: null,
    itemCount: 0,
    items: [],
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
  };
}

class FakeClock implements Clock {
  public nowCalls = 0;

  public constructor(private readonly current: Date) {}

  public now(): Date {
    this.nowCalls += 1;

    return this.current;
  }
}

class FakeAdminOrderReadRepository implements AdminOrderReadRepository {
  public readonly listCalls: ListAdminOrdersReadQuery[] = [];

  public constructor(private readonly orders: readonly AdminOrderReadModel[]) {}

  public async list(query: ListAdminOrdersReadQuery): Promise<readonly AdminOrderReadModel[]> {
    this.listCalls.push(query);

    return this.orders;
  }

  public async listHistory(): Promise<never> {
    throw new Error('listHistory was not expected in this test');
  }
}
