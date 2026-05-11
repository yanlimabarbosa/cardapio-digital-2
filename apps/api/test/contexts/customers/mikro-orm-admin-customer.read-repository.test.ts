import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmAdminCustomerReadRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-admin-customer.read-repository';
import { Customer, Order } from '../../../src/entities';

test('lists admin customers with legacy ordering, search, and order counts', async (): Promise<void> => {
  const firstCustomer = createCustomer('customer-1', {
    name: 'Yan',
    phone: '5581999999999',
    passwordHash: 'hash',
    loyaltyPoints: 20,
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
  });
  const secondCustomer = createCustomer('customer-2', {
    name: 'Avenir',
    phone: '5581888888888',
    passwordHash: undefined,
    loyaltyPoints: 5,
    createdAt: new Date('2026-05-06T12:00:00.000Z'),
  });
  const em = new FakeEntityManager([firstCustomer, secondCustomer], new Map([
    ['customer-1', 3],
    ['customer-2', 1],
  ]));
  const repository = new MikroOrmAdminCustomerReadRepository(em as unknown as EntityManager);

  const result = await repository.list('9999');

  assert.deepEqual(em.findCalls, [
    {
      entity: Customer,
      where: {
        $or: [
          { name: { $like: '%9999%' } },
          { phone: { $like: '%9999%' } },
        ],
      },
      options: { orderBy: { createdAt: 'DESC' } },
    },
  ]);
  assert.deepEqual(em.countCalls, [
    { entity: Order, where: { customer: firstCustomer } },
    { entity: Order, where: { customer: secondCustomer } },
  ]);
  assert.deepEqual(result, [
    {
      name: 'Yan',
      phone: '5581999999999',
      hasPassword: true,
      loyaltyPoints: 20,
      isAdmin: false,
      totalOrders: 3,
      memberSince: '2026-05-07T12:00:00.000Z',
    },
    {
      name: 'Avenir',
      phone: '5581888888888',
      hasPassword: false,
      loyaltyPoints: 5,
      isAdmin: false,
      totalOrders: 1,
      memberSince: '2026-05-06T12:00:00.000Z',
    },
  ]);
});

test('uses an empty legacy filter when search is not provided', async (): Promise<void> => {
  const em = new FakeEntityManager([], new Map());
  const repository = new MikroOrmAdminCustomerReadRepository(em as unknown as EntityManager);

  const result = await repository.list();

  assert.deepEqual(result, []);
  assert.deepEqual(em.findCalls, [
    {
      entity: Customer,
      where: {},
      options: { orderBy: { createdAt: 'DESC' } },
    },
  ]);
});

type CustomerCreateData = {
  readonly createdAt: Date;
  readonly loyaltyPoints: number;
  readonly name: string;
  readonly passwordHash: string | undefined;
  readonly phone: string;
};

type CustomerFindWhere = {
  readonly $or?: readonly [
    { readonly name: { readonly $like: string } },
    { readonly phone: { readonly $like: string } },
  ];
};

type CustomerFindOptions = {
  readonly orderBy: {
    readonly createdAt: 'DESC';
  };
};

type FindCall = {
  readonly entity: typeof Customer;
  readonly options: CustomerFindOptions;
  readonly where: CustomerFindWhere;
};

type CountCall = {
  readonly entity: typeof Order;
  readonly where: {
    readonly customer: Customer;
  };
};

class FakeEntityManager {
  public readonly countCalls: CountCall[] = [];
  public readonly findCalls: FindCall[] = [];

  public constructor(
    private readonly customers: readonly Customer[],
    private readonly orderCounts: ReadonlyMap<string, number>,
  ) {}

  public async find(
    entity: typeof Customer,
    where: CustomerFindWhere,
    options: CustomerFindOptions,
  ): Promise<Customer[]> {
    this.findCalls.push({ entity, where, options });

    return [...this.customers];
  }

  public async count(
    entity: typeof Order,
    where: CountCall['where'],
  ): Promise<number> {
    this.countCalls.push({ entity, where });

    return this.orderCounts.get(where.customer.id) ?? 0;
  }
}

function createCustomer(id: string, data: CustomerCreateData): Customer {
  const customer = new Customer();
  customer.id = id;
  customer.name = data.name;
  customer.phone = data.phone;
  customer.loyaltyPoints = data.loyaltyPoints;
  customer.createdAt = data.createdAt;

  if (data.passwordHash !== undefined) {
    customer.passwordHash = data.passwordHash;
  }

  return customer;
}
