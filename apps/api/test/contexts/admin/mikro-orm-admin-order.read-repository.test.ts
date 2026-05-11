import assert from 'node:assert/strict';
import test from 'node:test';
import { Collection } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/postgresql';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import { Order, OrderItem } from '../../../src/entities';
import { MikroOrmAdminOrderReadRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-order.read-repository';

test('lists active admin orders through the optimized legacy query shape', async (): Promise<void> => {
  const createdAtFrom = new Date('2026-05-07T00:00:00.000Z');
  const order = createOrder('order-1');
  const em = new FakeEntityManager([order]);
  const repository = new MikroOrmAdminOrderReadRepository(em as unknown as EntityManager);

  const result = await repository.list({
    mode: 'active',
    activeStatuses: [OrderStatus.PAID, OrderStatus.PREPARING],
    createdAtFrom,
    limit: 200,
  });

  assert.deepEqual(em.findCalls, [
    {
      entity: Order,
      where: [
        { status: { $in: [OrderStatus.PAID, OrderStatus.PREPARING] } },
        { createdAt: { $gte: createdAtFrom } },
      ],
      options: {
        populate: ['items'],
        orderBy: { createdAt: 'DESC' },
        limit: 200,
      },
    },
  ]);
  assert.equal(result[0]?.id, 'order-1');
  assert.equal(result[0]?.orderNumber, 42);
  assert.equal(result[0]?.totalAmount, 25);
  assert.equal(result[0]?.deliveryFee, 5);
  assert.equal(result[0]?.deliveryType, 'delivery');
  assert.equal(result[0]?.scheduledFor, '2026-05-07T15:00:00.000Z');
  assert.equal(result[0]?.itemCount, 1);
  assert.equal(result[0]?.items[0]?.extras?.[0]?.name, 'Farofa');
  assert.equal(result[0]?.items[0]?.groupedExtras?.[0]?.options[0]?.price, 3);
});

test('lists admin orders by explicit status without date filtering', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminOrderReadRepository(em as unknown as EntityManager);

  await repository.list({ mode: 'status', status: 'delivered', limit: 200 });

  assert.deepEqual(em.findCalls, [
    {
      entity: Order,
      where: { status: OrderStatus.DELIVERED },
      options: {
        populate: ['items'],
        orderBy: { createdAt: 'DESC' },
        limit: 200,
      },
    },
  ]);
});

test('defaults legacy pickup fields and empty grouped extras', async (): Promise<void> => {
  const order = createOrder('order-1', {
    deliveryFee: undefined,
    deliveryType: undefined,
    groupedExtras: undefined,
    scheduledFor: undefined,
  });
  const em = new FakeEntityManager([order]);
  const repository = new MikroOrmAdminOrderReadRepository(em as unknown as EntityManager);

  const result = await repository.list({ mode: 'status', status: 'paid', limit: 200 });

  assert.equal(result[0]?.deliveryFee, null);
  assert.equal(result[0]?.deliveryType, 'pickup');
  assert.equal(result[0]?.scheduledFor, null);
  assert.equal(result[0]?.items[0]?.groupedExtras, null);
});

test('lists admin order history with legacy filters and pagination', async (): Promise<void> => {
  const fromDate = new Date('2026-05-01');
  const toDate = new Date('2026-05-07');
  toDate.setHours(23, 59, 59, 999);
  const order = createOrder('order-1', {
    deliveryAddress: {
      cep: '50000-000',
      street: 'Rua Um',
      number: '42',
      complement: 'Apto 1',
      neighborhood: 'Centro',
      city: 'Recife',
      state: 'PE',
    },
  });
  const em = new FakeEntityManager([order], 45);
  const repository = new MikroOrmAdminOrderReadRepository(em as unknown as EntityManager);

  const result = await repository.listHistory({
    page: 3,
    limit: 20,
    search: '42',
    status: 'delivered',
    from: '2026-05-01',
    to: '2026-05-07',
  });

  assert.deepEqual(em.findAndCountCalls, [
    {
      entity: Order,
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { $gte: fromDate, $lte: toDate },
        orderNumber: 42,
      },
      options: {
        populate: ['items'],
        orderBy: { createdAt: 'DESC' },
        limit: 20,
        offset: 40,
      },
    },
  ]);
  assert.equal(result.total, 45);
  assert.equal(result.page, 3);
  assert.equal(result.totalPages, 3);
  assert.equal(result.data[0]?.deliveryAddress?.street, 'Rua Um');
  assert.equal(result.data[0]?.deliveryAddress?.complement, 'Apto 1');
  assert.equal(result.data[0]?.items[0]?.extras?.[0]?.name, 'Farofa');
});

test('lists admin order history by customer-name search when search is not an exact number', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminOrderReadRepository(em as unknown as EntityManager);

  await repository.listHistory({ page: 1, limit: 20, search: 'Yan 42' });

  assert.deepEqual(em.findAndCountCalls, [
    {
      entity: Order,
      where: { customerName: { $ilike: '%Yan 42%' } },
      options: {
        populate: ['items'],
        orderBy: { createdAt: 'DESC' },
        limit: 20,
        offset: 0,
      },
    },
  ]);
});

type OrderOverrides = {
  readonly deliveryAddress?: Order['deliveryAddress'];
  readonly deliveryFee?: string;
  readonly deliveryType?: string;
  readonly groupedExtras?: Array<{
    readonly groupId: string;
    readonly groupName: string;
    readonly options: Array<{ readonly name: string; readonly price: number }>;
  }>;
  readonly scheduledFor?: Date;
};

function createOrder(id: string, overrides: OrderOverrides = {}): Order {
  const order = new Order();
  order.id = id;
  order.orderNumber = 42;
  order.customerName = 'Yan';
  order.customerPhone = '81999999999';
  order.status = OrderStatus.PAID;
  order.totalAmount = '25.00';
  order.deliveryFee = 'deliveryFee' in overrides ? overrides.deliveryFee : '5.00';
  order.paymentMethod = PaymentMethod.PIX;
  order.paymentStatus = PaymentStatus.APPROVED;
  order.deliveryType = 'deliveryType' in overrides ? overrides.deliveryType : 'delivery';
  order.deliveryAddress =
    'deliveryAddress' in overrides ? overrides.deliveryAddress : undefined;
  order.scheduledFor =
    'scheduledFor' in overrides
      ? overrides.scheduledFor
      : new Date('2026-05-07T15:00:00.000Z');
  order.createdAt = new Date('2026-05-07T12:00:00.000Z');
  order.items = new FakeCollection([
    createOrderItem(
      'item-1',
      'groupedExtras' in overrides
        ? overrides.groupedExtras
        : [{ groupId: 'group-1', groupName: 'Carne', options: [{ name: 'Bife', price: 3 }] }],
    ),
  ]) as unknown as Collection<OrderItem>;

  return order;
}

function createOrderItem(
  id: string,
  groupedExtras: OrderOverrides['groupedExtras'],
): OrderItem {
  const item = new OrderItem();
  item.id = id;
  item.productName = 'Quentinha';
  item.unitPrice = '17.00';
  item.quantity = 1;
  item.subtotal = '20.00';
  item.extras = [{ name: 'Farofa', price: 3 }];
  item.groupedExtras = groupedExtras;

  return item;
}

class FakeCollection<T> {
  public constructor(private readonly items: readonly T[]) {}

  public get length(): number {
    return this.items.length;
  }

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

  public readonly findAndCountCalls: Array<{
    readonly entity: unknown;
    readonly where: unknown;
    readonly options: unknown;
  }> = [];

  public constructor(
    private readonly orders: readonly Order[],
    private readonly total: number = orders.length,
  ) {}

  public async find(entity: unknown, where: unknown, options: unknown): Promise<readonly Order[]> {
    this.findCalls.push({ entity, where, options });

    return this.orders;
  }

  public async findAndCount(
    entity: unknown,
    where: unknown,
    options: unknown,
  ): Promise<[readonly Order[], number]> {
    this.findAndCountCalls.push({ entity, where, options });

    return [this.orders, this.total];
  }
}
