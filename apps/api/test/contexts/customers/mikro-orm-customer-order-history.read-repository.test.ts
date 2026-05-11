import assert from 'node:assert/strict';
import test from 'node:test';
import { Collection } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/postgresql';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import { MikroOrmCustomerOrderHistoryReadRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-order-history.read-repository';
import { Customer, Order, OrderItem } from '../../../src/entities';

test('gets a customer order history page with the legacy query and response fields', async (): Promise<void> => {
  const customer = createCustomer('customer-1');
  const order = createOrder(customer, {
    id: 'order-1',
    deliveryFee: '5.00',
    deliveryType: 'delivery',
    extras: [{ name: 'Farofa', price: 3 }],
    scheduledFor: new Date('2026-05-07T15:00:00.000Z'),
  });
  const em = new FakeEntityManager(customer, [order], 5);
  const repository = new MikroOrmCustomerOrderHistoryReadRepository(em as unknown as EntityManager);

  const result = await repository.getByCustomerId({
    customerId: 'customer-1',
    page: 2,
    limit: 2,
  });

  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { id: 'customer-1', isActive: true },
    },
  ]);
  assert.deepEqual(em.findAndCountCalls, [
    {
      entity: Order,
      where: { customer },
      options: {
        populate: ['items'],
        orderBy: { createdAt: 'DESC' },
        limit: 2,
        offset: 2,
      },
    },
  ]);
  assert.deepEqual(result, {
    orders: [
      {
        id: 'order-1',
        orderNumber: 42,
        customerName: 'Yan',
        status: OrderStatus.PAID,
        totalAmount: 25,
        deliveryFee: 5,
        paymentMethod: PaymentMethod.PIX,
        paymentStatus: PaymentStatus.APPROVED,
        deliveryType: 'delivery',
        scheduledFor: '2026-05-07T15:00:00.000Z',
        items: [
          {
            id: 'item-1',
            productName: 'Quentinha',
            unitPrice: 17,
            quantity: 1,
            subtotal: 20,
            extras: [{ name: 'Farofa', price: 3 }],
          },
        ],
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    ],
    total: 5,
    page: 2,
    totalPages: 3,
  });
});

test('preserves legacy pickup defaults and missing extras', async (): Promise<void> => {
  const customer = createCustomer('customer-1');
  const order = createOrder(customer, {
    id: 'order-1',
    deliveryFee: undefined,
    deliveryType: undefined,
    extras: undefined,
    scheduledFor: undefined,
  });
  const em = new FakeEntityManager(customer, [order], 1);
  const repository = new MikroOrmCustomerOrderHistoryReadRepository(em as unknown as EntityManager);

  const result = await repository.getByCustomerId({
    customerId: 'customer-1',
    page: 1,
    limit: 10,
  });

  assert.equal(result?.orders[0]?.deliveryFee, null);
  assert.equal(result?.orders[0]?.deliveryType, 'pickup');
  assert.equal(result?.orders[0]?.scheduledFor, null);
  assert.equal(result?.orders[0]?.items[0]?.extras, undefined);
});

test('returns null without querying orders when the active customer is missing', async (): Promise<void> => {
  const em = new FakeEntityManager(null, [], 0);
  const repository = new MikroOrmCustomerOrderHistoryReadRepository(em as unknown as EntityManager);

  const result = await repository.getByCustomerId({
    customerId: 'missing-customer',
    page: 1,
    limit: 10,
  });

  assert.equal(result, null);
  assert.deepEqual(em.findAndCountCalls, []);
});

type CustomerFindWhere = {
  readonly id: string;
  readonly isActive: true;
};

type OrderFindWhere = {
  readonly customer: Customer;
};

type OrderFindOptions = {
  readonly limit: number;
  readonly offset: number;
  readonly orderBy: {
    readonly createdAt: 'DESC';
  };
  readonly populate: readonly ['items'];
};

type FindOneCall = {
  readonly entity: typeof Customer;
  readonly where: CustomerFindWhere;
};

type FindAndCountCall = {
  readonly entity: typeof Order;
  readonly options: OrderFindOptions;
  readonly where: OrderFindWhere;
};

type OrderOverrides = {
  readonly deliveryFee?: string;
  readonly deliveryType?: string;
  readonly extras?: Array<{ readonly name: string; readonly price: number }>;
  readonly id: string;
  readonly scheduledFor?: Date;
};

class FakeEntityManager {
  public readonly findAndCountCalls: FindAndCountCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];

  public constructor(
    private readonly customer: Customer | null,
    private readonly orders: Order[],
    private readonly total: number,
  ) {}

  public async findOne(entity: typeof Customer, where: CustomerFindWhere): Promise<Customer | null> {
    this.findOneCalls.push({ entity, where });

    return this.customer;
  }

  public async findAndCount(
    entity: typeof Order,
    where: OrderFindWhere,
    options: OrderFindOptions,
  ): Promise<[Order[], number]> {
    this.findAndCountCalls.push({ entity, where, options });

    return [this.orders, this.total];
  }
}

function createCustomer(id: string): Customer {
  const customer = new Customer();
  customer.id = id;
  customer.name = 'Yan';
  customer.phone = '81999990000';
  customer.loyaltyPoints = 30;

  return customer;
}

function createOrder(customer: Customer, overrides: OrderOverrides): Order {
  const order = new Order();
  order.id = overrides.id;
  order.orderNumber = 42;
  order.customer = customer;
  order.customerName = 'Yan';
  order.customerPhone = '81999990000';
  order.status = OrderStatus.PAID;
  order.totalAmount = '25.00';
  order.deliveryFee = overrides.deliveryFee;
  order.paymentMethod = PaymentMethod.PIX;
  order.paymentStatus = PaymentStatus.APPROVED;
  order.deliveryType = overrides.deliveryType;
  order.scheduledFor = overrides.scheduledFor;
  order.createdAt = new Date('2026-05-07T12:00:00.000Z');
  order.items = new FakeCollection([
    createOrderItem('item-1', overrides.extras),
  ]) as unknown as Collection<OrderItem>;

  return order;
}

function createOrderItem(
  id: string,
  extras: Array<{ readonly name: string; readonly price: number }> | undefined,
): OrderItem {
  const item = new OrderItem();
  item.id = id;
  item.productName = 'Quentinha';
  item.unitPrice = '17.00';
  item.quantity = 1;
  item.subtotal = '20.00';
  item.extras = extras;

  return item;
}

class FakeCollection<T> {
  public constructor(private readonly items: readonly T[]) {}

  public getItems(): T[] {
    return [...this.items];
  }
}
