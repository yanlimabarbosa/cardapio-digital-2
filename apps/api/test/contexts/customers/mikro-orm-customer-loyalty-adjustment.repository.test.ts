import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCustomerLoyaltyAdjustmentRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-loyalty-adjustment.repository';
import { Customer, LoyaltyTransaction } from '../../../src/entities';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('finds a customer loyalty adjustment target by id', async (): Promise<void> => {
  const customer = createCustomer('customer-1', 30);
  const em = new FakeEntityManager({ customer, updatedBalance: 45 });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerLoyaltyAdjustmentRepository();

  const result = await repository.findTarget('customer-1', context);

  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { id: 'customer-1' },
    },
  ]);
  assert.deepEqual(result, {
    id: 'customer-1',
    phone: '81999990000',
    balance: 30,
  });
});

test('returns null when the loyalty adjustment target is missing', async (): Promise<void> => {
  const em = new FakeEntityManager({ customer: null, updatedBalance: 45 });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerLoyaltyAdjustmentRepository();

  const result = await repository.findTarget('missing-customer', context);

  assert.equal(result, null);
});

test('applies a balance adjustment with the legacy SQL guard and transaction row', async (): Promise<void> => {
  const customer = createCustomer('customer-1', 30);
  const em = new FakeEntityManager({ customer, updatedBalance: 45 });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerLoyaltyAdjustmentRepository();

  const result = await repository.applyAdjustment(
    {
      customerId: 'customer-1',
      customerPhone: '81999990000',
      points: 15,
      description: 'Bonus manual',
    },
    context,
  );

  assert.deepEqual(em.connection.executeCalls, [
    {
      sql: `UPDATE "customers"
       SET "loyalty_points" = "loyalty_points" + ?
       WHERE "id" = ? AND "loyalty_points" + ? >= 0
       RETURNING "loyalty_points"`,
      params: [15, 'customer-1', 15],
    },
  ]);
  assert.deepEqual(em.getReferenceCalls, [
    {
      entity: Customer,
      id: 'customer-1',
    },
  ]);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(em.createCalls, [
    {
      entity: LoyaltyTransaction,
      data: {
        customer,
        points: 15,
        type: 'adjustment',
        description: 'Bonus manual',
      },
    },
  ]);
  assert.deepEqual(result, {
    status: 'adjusted',
    balance: 45,
    transaction: {
      id: 'transaction-1',
      points: 15,
      type: 'adjustment',
    },
  });
});

test('reports insufficient balance without creating a transaction row', async (): Promise<void> => {
  const customer = createCustomer('customer-1', 30);
  const em = new FakeEntityManager({ customer, updatedBalance: undefined });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerLoyaltyAdjustmentRepository();

  const result = await repository.applyAdjustment(
    {
      customerId: 'customer-1',
      customerPhone: '81999990000',
      points: -40,
      description: 'Ajuste manual (debito)',
    },
    context,
  );

  assert.deepEqual(result, { status: 'insufficient-balance' });
  assert.deepEqual(em.createCalls, []);
  assert.equal(em.flushCalls, 0);
});

type CustomerFindWhere = {
  readonly id: string;
};

type FindOneCall = {
  readonly entity: typeof Customer;
  readonly where: CustomerFindWhere;
};

type ExecuteCall = {
  readonly params: readonly [number, string, number];
  readonly sql: string;
};

type GetReferenceCall = {
  readonly entity: typeof Customer;
  readonly id: string;
};

type CreateLoyaltyTransactionData = {
  readonly customer: Customer;
  readonly description: string;
  readonly points: number;
  readonly type: 'adjustment';
};

type CreateCall = {
  readonly data: CreateLoyaltyTransactionData;
  readonly entity: typeof LoyaltyTransaction;
};

type FakeEntityManagerOptions = {
  readonly customer: Customer | null;
  readonly updatedBalance: number | undefined;
};

class FakeConnection {
  public readonly executeCalls: ExecuteCall[] = [];

  public constructor(private readonly updatedBalance: number | undefined) {}

  public async execute(
    sql: string,
    params: [number, string, number],
  ): Promise<Array<{ loyalty_points: number }>> {
    this.executeCalls.push({ sql, params });

    if (this.updatedBalance === undefined) {
      return [];
    }

    return [{ loyalty_points: this.updatedBalance }];
  }
}

class FakeEntityManager {
  public readonly connection: FakeConnection;
  public readonly createCalls: CreateCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];
  public readonly getReferenceCalls: GetReferenceCall[] = [];
  public flushCalls: number = 0;

  public constructor(private readonly options: FakeEntityManagerOptions) {
    this.connection = new FakeConnection(options.updatedBalance);
  }

  public async findOne(entity: typeof Customer, where: CustomerFindWhere): Promise<Customer | null> {
    this.findOneCalls.push({ entity, where });

    return this.options.customer;
  }

  public getConnection(): FakeConnection {
    return this.connection;
  }

  public getReference(entity: typeof Customer, id: string): Customer {
    this.getReferenceCalls.push({ entity, id });

    return this.options.customer ?? createCustomer(id, 0);
  }

  public create(
    entity: typeof LoyaltyTransaction,
    data: CreateLoyaltyTransactionData,
  ): LoyaltyTransaction {
    this.createCalls.push({ entity, data });

    const transaction = new LoyaltyTransaction();
    transaction.id = 'transaction-1';
    transaction.customer = data.customer;
    transaction.points = data.points;
    transaction.type = data.type;
    transaction.description = data.description;

    return transaction;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
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
