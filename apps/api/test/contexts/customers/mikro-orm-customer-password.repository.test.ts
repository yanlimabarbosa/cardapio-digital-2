import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCustomerPasswordRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-password.repository';
import { Customer } from '../../../src/entities';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('returns not found without hashing or flushing when the customer is missing', async (): Promise<void> => {
  const em = new FakeEntityManager(null);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const hashCalls: string[] = [];
  const repository = new MikroOrmCustomerPasswordRepository(async (password) => {
    hashCalls.push(password);

    return 'hashed-password';
  });

  const result = await repository.setPassword(
    {
      customerId: 'missing-customer',
      password: 'secret123',
    },
    context,
  );

  assert.deepEqual(result, { status: 'not-found' });
  assert.deepEqual(hashCalls, []);
  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { id: 'missing-customer' },
    },
  ]);
  assert.equal(em.flushCalls, 0);
});

test('returns already set without hashing or flushing when a password exists', async (): Promise<void> => {
  const customer = createCustomer({ passwordHash: 'existing-hash' });
  const em = new FakeEntityManager(customer);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const hashCalls: string[] = [];
  const repository = new MikroOrmCustomerPasswordRepository(async (password) => {
    hashCalls.push(password);

    return 'hashed-password';
  });

  const result = await repository.setPassword(
    {
      customerId: 'customer-1',
      password: 'secret123',
    },
    context,
  );

  assert.deepEqual(result, { status: 'already-set' });
  assert.deepEqual(hashCalls, []);
  assert.equal(customer.passwordHash, 'existing-hash');
  assert.equal(em.flushCalls, 0);
});

test('hashes and stores a new customer password with the legacy response model', async (): Promise<void> => {
  const customer = createCustomer({ passwordHash: undefined });
  const em = new FakeEntityManager(customer);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerPasswordRepository(async (password) => `hashed:${password}`);

  const result = await repository.setPassword(
    {
      customerId: 'customer-1',
      password: 'secret123',
    },
    context,
  );

  assert.equal(customer.passwordHash, 'hashed:secret123');
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'updated',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 30,
      isAdmin: false,
    },
  });
});

type CustomerFindWhere = {
  readonly id: string;
};

type FindOneCall = {
  readonly entity: typeof Customer;
  readonly where: CustomerFindWhere;
};

type CustomerData = {
  readonly passwordHash: string | undefined;
};

class FakeEntityManager {
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls: number = 0;

  public constructor(private readonly customer: Customer | null) {}

  public async findOne(entity: typeof Customer, where: CustomerFindWhere): Promise<Customer | null> {
    this.findOneCalls.push({ entity, where });

    return this.customer;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}

function createCustomer(data: CustomerData): Customer {
  const customer = new Customer();
  customer.id = 'customer-1';
  customer.name = 'Yan';
  customer.phone = '81999990000';
  customer.token = 'customer-token';
  customer.loyaltyPoints = 30;

  if (data.passwordHash !== undefined) {
    customer.passwordHash = data.passwordHash;
  }

  return customer;
}
