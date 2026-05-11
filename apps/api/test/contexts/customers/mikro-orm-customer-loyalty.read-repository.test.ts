import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCustomerLoyaltyReadRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-loyalty.read-repository';
import { Customer, LoyaltyTransaction } from '../../../src/entities';

test('gets a customer loyalty page with legacy response fields', async (): Promise<void> => {
  const customer = createCustomer('customer-1', 30);
  const transactions = [
    createTransaction({
      id: 'transaction-1',
      customer,
      points: 10,
      type: 'earn',
      description: 'Pedido #1',
      createdAt: new Date('2026-05-07T12:00:00.000Z'),
    }),
    createTransaction({
      id: 'transaction-2',
      customer,
      points: -5,
      type: 'redeem',
      description: undefined,
      createdAt: new Date('2026-05-06T12:00:00.000Z'),
    }),
  ];
  const em = new FakeEntityManager(customer, transactions, 6);
  const repository = new MikroOrmCustomerLoyaltyReadRepository(em as unknown as EntityManager);

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
      entity: LoyaltyTransaction,
      where: { customer },
      options: {
        orderBy: { createdAt: 'DESC' },
        limit: 2,
        offset: 2,
      },
    },
  ]);
  assert.deepEqual(result, {
    balance: 30,
    transactions: [
      {
        id: 'transaction-1',
        points: 10,
        type: 'earn',
        description: 'Pedido #1',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
      {
        id: 'transaction-2',
        points: -5,
        type: 'redeem',
        description: null,
        createdAt: '2026-05-06T12:00:00.000Z',
      },
    ],
    total: 6,
    page: 2,
    totalPages: 3,
  });
});

test('returns null without querying transactions when the active customer is missing', async (): Promise<void> => {
  const em = new FakeEntityManager(null, [], 0);
  const repository = new MikroOrmCustomerLoyaltyReadRepository(em as unknown as EntityManager);

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

type TransactionFindWhere = {
  readonly customer: Customer;
};

type TransactionFindOptions = {
  readonly limit: number;
  readonly offset: number;
  readonly orderBy: {
    readonly createdAt: 'DESC';
  };
};

type FindOneCall = {
  readonly entity: typeof Customer;
  readonly where: CustomerFindWhere;
};

type FindAndCountCall = {
  readonly entity: typeof LoyaltyTransaction;
  readonly options: TransactionFindOptions;
  readonly where: TransactionFindWhere;
};

type TransactionData = {
  readonly createdAt: Date;
  readonly customer: Customer;
  readonly description: string | undefined;
  readonly id: string;
  readonly points: number;
  readonly type: string;
};

class FakeEntityManager {
  public readonly findAndCountCalls: FindAndCountCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];

  public constructor(
    private readonly customer: Customer | null,
    private readonly transactions: LoyaltyTransaction[],
    private readonly total: number,
  ) {}

  public async findOne(entity: typeof Customer, where: CustomerFindWhere): Promise<Customer | null> {
    this.findOneCalls.push({ entity, where });

    return this.customer;
  }

  public async findAndCount(
    entity: typeof LoyaltyTransaction,
    where: TransactionFindWhere,
    options: TransactionFindOptions,
  ): Promise<[LoyaltyTransaction[], number]> {
    this.findAndCountCalls.push({ entity, where, options });

    return [this.transactions, this.total];
  }
}

function createCustomer(id: string, loyaltyPoints: number): Customer {
  const customer = new Customer();
  customer.id = id;
  customer.name = 'Yan';
  customer.phone = '81999990000';
  customer.loyaltyPoints = loyaltyPoints;

  return customer;
}

function createTransaction(data: TransactionData): LoyaltyTransaction {
  const transaction = new LoyaltyTransaction();
  transaction.id = data.id;
  transaction.customer = data.customer;
  transaction.points = data.points;
  transaction.type = data.type;
  transaction.createdAt = data.createdAt;

  if (data.description !== undefined) {
    transaction.description = data.description;
  }

  return transaction;
}
