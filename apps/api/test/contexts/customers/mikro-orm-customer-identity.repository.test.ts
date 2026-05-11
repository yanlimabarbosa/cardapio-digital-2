import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCustomerIdentityRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-identity.repository';
import { CustomerPhone } from '../../../src/modules/customers/domain/customer-phone.value-object';
import { Customer } from '../../../src/entities';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('returns missing when no customer exists for the normalized phone', async (): Promise<void> => {
  const em = new FakeEntityManager(null);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerIdentityRepository(() => 'new-token');

  const result = await repository.identifyByPhone(CustomerPhone.from('(81) 99999-0000'), context);

  assert.deepEqual(result, { status: 'missing' });
  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { phone: '81999990000' },
    },
  ]);
  assert.equal(em.flushCalls, 0);
});

test('returns password-required without rotating a token when the customer has a password', async (): Promise<void> => {
  const customer = createCustomer({ passwordHash: 'hash', token: 'old-token' });
  const em = new FakeEntityManager(customer);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerIdentityRepository(() => 'new-token');

  const result = await repository.identifyByPhone(CustomerPhone.from('81999990000'), context);

  assert.deepEqual(result, { status: 'password-required' });
  assert.equal(customer.token, 'old-token');
  assert.equal(em.flushCalls, 0);
});

test('rotates the token and returns an identity model for passwordless customers', async (): Promise<void> => {
  const customer = createCustomer({ passwordHash: undefined, token: 'old-token' });
  const em = new FakeEntityManager(customer);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerIdentityRepository(() => 'new-token');

  const result = await repository.identifyByPhone(CustomerPhone.from('81999990000'), context);

  assert.equal(customer.token, 'new-token');
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'authenticated',
    token: 'new-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: false,
      loyaltyPoints: 30,
      isAdmin: false,
    },
  });
});

type CustomerFindWhere = {
  readonly phone: string;
};

type FindOneCall = {
  readonly entity: typeof Customer;
  readonly where: CustomerFindWhere;
};

type CustomerCreateData = {
  readonly passwordHash: string | undefined;
  readonly token: string;
};

class FakeEntityManager {
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls = 0;

  public constructor(private readonly customer: Customer | null) {}

  public async findOne(entity: typeof Customer, where: CustomerFindWhere): Promise<Customer | null> {
    this.findOneCalls.push({ entity, where });

    return this.customer;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}

function createCustomer(data: CustomerCreateData): Customer {
  const customer = new Customer();
  customer.id = 'customer-1';
  customer.name = 'Yan';
  customer.phone = '81999990000';
  customer.token = data.token;
  customer.loyaltyPoints = 30;

  if (data.passwordHash !== undefined) {
    customer.passwordHash = data.passwordHash;
  }

  return customer;
}
