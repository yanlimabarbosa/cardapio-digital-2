import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCustomerLoginRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-login.repository';
import { CustomerPhone } from '../../../src/modules/customers/domain/customer-phone.value-object';
import { AdminUser, Customer } from '../../../src/entities';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('returns invalid credentials without comparing or flushing when the customer is missing', async (): Promise<void> => {
  const em = new FakeEntityManager({ customer: null, adminUser: null });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const compareCalls: PasswordCompareCall[] = [];
  const repository = new MikroOrmCustomerLoginRepository(
    async (password, passwordHash) => {
      compareCalls.push({ password, passwordHash });

      return true;
    },
    () => 'new-token',
  );

  const result = await repository.login(
    {
      phone: CustomerPhone.from('(81) 99999-0000'),
      password: 'secret',
    },
    context,
  );

  assert.deepEqual(result, { status: 'invalid-credentials' });
  assert.deepEqual(compareCalls, []);
  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { phone: '81999990000' },
    },
  ]);
  assert.equal(em.flushCalls, 0);
});

test('returns invalid credentials without comparing or flushing when the customer has no password', async (): Promise<void> => {
  const customer = createCustomer({ passwordHash: undefined, token: 'old-token' });
  const em = new FakeEntityManager({ customer, adminUser: null });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const compareCalls: PasswordCompareCall[] = [];
  const repository = new MikroOrmCustomerLoginRepository(
    async (password, passwordHash) => {
      compareCalls.push({ password, passwordHash });

      return true;
    },
    () => 'new-token',
  );

  const result = await repository.login(
    {
      phone: CustomerPhone.from('81999990000'),
      password: 'secret',
    },
    context,
  );

  assert.deepEqual(result, { status: 'invalid-credentials' });
  assert.deepEqual(compareCalls, []);
  assert.equal(customer.token, 'old-token');
  assert.equal(em.flushCalls, 0);
});

test('returns invalid password without rotating the token when comparison fails', async (): Promise<void> => {
  const customer = createCustomer({ passwordHash: 'hashed-password', token: 'old-token' });
  const em = new FakeEntityManager({ customer, adminUser: null });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const compareCalls: PasswordCompareCall[] = [];
  const repository = new MikroOrmCustomerLoginRepository(
    async (password, passwordHash) => {
      compareCalls.push({ password, passwordHash });

      return false;
    },
    () => 'new-token',
  );

  const result = await repository.login(
    {
      phone: CustomerPhone.from('81999990000'),
      password: 'wrong',
    },
    context,
  );

  assert.deepEqual(result, { status: 'invalid-password' });
  assert.deepEqual(compareCalls, [{ password: 'wrong', passwordHash: 'hashed-password' }]);
  assert.equal(customer.token, 'old-token');
  assert.equal(em.flushCalls, 0);
});

test('authenticates, rotates the token, and returns the legacy response model', async (): Promise<void> => {
  const customer = createCustomer({ passwordHash: 'hashed-password', token: 'old-token' });
  const em = new FakeEntityManager({
    customer,
    adminUser: createAdminUser('admin-1', '81999990000'),
  });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerLoginRepository(
    async (password, passwordHash) => password === 'secret' && passwordHash === 'hashed-password',
    () => 'new-token',
  );

  const result = await repository.login(
    {
      phone: CustomerPhone.from('(81) 99999-0000'),
      password: 'secret',
    },
    context,
  );

  assert.equal(customer.token, 'new-token');
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { phone: '81999990000' },
    },
    {
      entity: AdminUser,
      where: { phone: '81999990000' },
    },
  ]);
  assert.deepEqual(result, {
    status: 'authenticated',
    token: 'new-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 30,
      isAdmin: true,
    },
  });
});

type PasswordCompareCall = {
  readonly password: string;
  readonly passwordHash: string;
};

type CustomerFindWhere = {
  readonly phone: string;
};

type FindOneCall =
  | {
      readonly entity: typeof Customer;
      readonly where: CustomerFindWhere;
    }
  | {
      readonly entity: typeof AdminUser;
      readonly where: CustomerFindWhere;
    };

type CustomerData = {
  readonly passwordHash: string | undefined;
  readonly token: string;
};

type FakeEntityManagerData = {
  readonly adminUser: AdminUser | null;
  readonly customer: Customer | null;
};

class FakeEntityManager {
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls: number = 0;

  public constructor(private readonly data: FakeEntityManagerData) {}

  public async findOne(
    entity: typeof Customer,
    where: CustomerFindWhere,
  ): Promise<Customer | null>;
  public async findOne(
    entity: typeof AdminUser,
    where: CustomerFindWhere,
  ): Promise<AdminUser | null>;
  public async findOne(
    entity: typeof Customer | typeof AdminUser,
    where: CustomerFindWhere,
  ): Promise<Customer | AdminUser | null> {
    if (entity === Customer) {
      this.findOneCalls.push({ entity: Customer, where });

      return this.data.customer;
    }

    this.findOneCalls.push({ entity: AdminUser, where });

    return this.data.adminUser;
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
  customer.token = data.token;
  customer.loyaltyPoints = 30;

  if (data.passwordHash !== undefined) {
    customer.passwordHash = data.passwordHash;
  }

  return customer;
}

function createAdminUser(id: string, phone: string): AdminUser {
  const admin = new AdminUser();
  admin.id = id;
  admin.email = 'admin@example.com';
  admin.passwordHash = 'hash';
  admin.name = 'Admin';
  admin.phone = phone;

  return admin;
}
