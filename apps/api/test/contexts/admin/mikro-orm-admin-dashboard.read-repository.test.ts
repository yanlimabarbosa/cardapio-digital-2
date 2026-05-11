import assert from 'node:assert/strict';
import test from 'node:test';
import { Collection } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/postgresql';
import { OrderStatus, PaymentMethod } from '@cardapio/shared';
import { Order, OrderItem } from '../../../src/entities';
import { MikroOrmAdminDashboardReadRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-dashboard.read-repository';

test('builds the admin dashboard with the legacy query and aggregation shape', async (): Promise<void> => {
  const periodStart = new Date('2026-05-07T00:00:00.000Z');
  const periodEndExclusive = new Date('2026-05-08T00:00:00.000Z');
  const dayStart = new Date('2026-05-07T00:00:00.000Z');
  const dayEnd = new Date('2026-05-08T00:00:00.000Z');
  const paidOrder = createOrder({
    id: 'order-1',
    createdAt: new Date('2026-05-07T10:00:00.000Z'),
    paymentMethod: PaymentMethod.PIX,
    status: OrderStatus.PAID,
    totalAmount: '25.50',
    items: [createOrderItem('item-1', 'Quentinha', 1, '25.50')],
  });
  const pendingOrder = createOrder({
    id: 'order-2',
    createdAt: new Date('2026-05-07T11:00:00.000Z'),
    paymentMethod: PaymentMethod.CREDIT_CARD,
    status: OrderStatus.PENDING_PAYMENT,
    totalAmount: '12.00',
    items: [createOrderItem('item-2', 'Suco', 1, '12.00')],
  });
  const deliveredOrder = createOrder({
    id: 'order-3',
    createdAt: new Date('2026-05-07T10:30:00.000Z'),
    paymentMethod: PaymentMethod.PIX,
    status: OrderStatus.DELIVERED,
    totalAmount: '14.50',
    items: [
      createOrderItem('item-3', 'Quentinha', 2, '20.00'),
      createOrderItem('item-4', 'Suco', 1, '5.50'),
    ],
  });
  const em = new FakeEntityManager(
    [paidOrder, pendingOrder, deliveredOrder],
    [[paidOrder, deliveredOrder]],
  );
  const repository = new MikroOrmAdminDashboardReadRepository(em as unknown as EntityManager);

  const result = await repository.get({
    periodStart,
    periodEndExclusive,
    paidStatuses: [
      OrderStatus.PAID,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ],
    days: [{ date: '2026-05-07', start: dayStart, end: dayEnd }],
  });

  assert.deepEqual(em.findCalls, [
    {
      entity: Order,
      where: { createdAt: { $gte: periodStart, $lt: periodEndExclusive } },
      options: { populate: ['items'] },
    },
    {
      entity: Order,
      where: {
        createdAt: { $gte: dayStart, $lt: dayEnd },
        status: {
          $in: [
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.DELIVERED,
          ],
        },
      },
      options: undefined,
    },
  ]);
  assert.equal(result.todayOrdersCount, 3);
  assert.equal(result.todayPaidCount, 2);
  assert.equal(result.todayRevenue, 40);
  assert.equal(result.avgTicket, 20);
  assert.deepEqual(result.ordersByStatus, {
    paid: 1,
    pending_payment: 1,
    delivered: 1,
  });
  assert.deepEqual(result.byPayment, { pix: 2 });
  assert.deepEqual(result.topProducts, [
    { name: 'Quentinha', qty: 3, revenue: 45.5 },
    { name: 'Suco', qty: 1, revenue: 5.5 },
  ]);
  assert.deepEqual(
    result.revenueByHour.find((hour) => hour.hour === 7),
    { hour: 7, revenue: 40, orders: 2 },
  );
  assert.deepEqual(result.weeklyRevenue, [{ date: '2026-05-07', revenue: 40, orders: 2 }]);
});

type CreateOrderOptions = {
  readonly createdAt: Date;
  readonly id: string;
  readonly items: readonly OrderItem[];
  readonly paymentMethod: PaymentMethod;
  readonly status: OrderStatus;
  readonly totalAmount: string;
};

function createOrder(options: CreateOrderOptions): Order {
  const order = new Order();
  order.id = options.id;
  order.orderNumber = 42;
  order.customerName = 'Yan';
  order.customerPhone = '81999999999';
  order.status = options.status;
  order.totalAmount = options.totalAmount;
  order.paymentMethod = options.paymentMethod;
  order.createdAt = options.createdAt;
  order.items = new FakeCollection(options.items) as unknown as Collection<OrderItem>;

  return order;
}

function createOrderItem(
  id: string,
  productName: string,
  quantity: number,
  subtotal: string,
): OrderItem {
  const item = new OrderItem();
  item.id = id;
  item.productName = productName;
  item.unitPrice = subtotal;
  item.quantity = quantity;
  item.subtotal = subtotal;

  return item;
}

class FakeCollection<T> {
  public constructor(private readonly items: readonly T[]) {}

  public getItems(): T[] {
    return [...this.items];
  }
}

class FakeEntityManager {
  public readonly findCalls: Array<{
    readonly entity: unknown;
    readonly where: unknown;
    readonly options: unknown;
  }> = [];

  private weeklyCallIndex = 0;

  public constructor(
    private readonly todayOrders: readonly Order[],
    private readonly weeklyOrders: readonly (readonly Order[])[],
  ) {}

  public async find(
    entity: unknown,
    where: unknown,
    options?: unknown,
  ): Promise<readonly Order[]> {
    this.findCalls.push({ entity, where, options });

    if (options) {
      return this.todayOrders;
    }

    const orders = this.weeklyOrders[this.weeklyCallIndex] ?? [];
    this.weeklyCallIndex += 1;

    return orders;
  }
}
