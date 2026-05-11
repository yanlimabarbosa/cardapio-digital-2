import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCustomerRegistrationRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-registration.repository';
import { CustomerPhone } from '../../../src/modules/customers/domain/customer-phone.value-object';
import { AdminUser, Customer } from '../../../src/entities';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('returns duplicate without hashing or flushing when the phone exists', async (): Promise<void> => {
  const existing = createCustomer('existing-customer');
  const em = new FakeEntityManager({ customers: [existing], adminUser: null });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const hashCalls: string[] = [];
  const repository = new MikroOrmCustomerRegistrationRepository(
    async (password) => {
      hashCalls.push(password);

      return 'hashed-password';
    },
    () => 'new-token',
  );

  const result = await repository.register(
    {
      phone: CustomerPhone.from('(81) 99999-0000'),
      name: 'Yan',
      password: 'secret',
    },
    context,
  );

  assert.deepEqual(result, { status: 'duplicate-phone' });
  assert.deepEqual(hashCalls, []);
  assert.deepEqual(em.createCalls, []);
  assert.equal(em.flushCalls, 0);
});

test('registers a customer and returns the legacy response model', async (): Promise<void> => {
  const em = new FakeEntityManager({
    customers: [null],
    adminUser: createAdminUser('admin-1', '81999990000'),
  });
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmCustomerRegistrationRepository(
    async (password) => `hashed:${password}`,
    () => 'new-token',
  );

  const result = await repository.register(
    {
      phone: CustomerPhone.from('(81) 99999-0000'),
      name: 'Yan',
      password: 'secret',
    },
    context,
  );

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
  assert.deepEqual(em.createCalls, [
    {
      entity: Customer,
      data: {
        phone: '81999990000',
        name: 'Yan',
        passwordHash: 'hashed:secret',
        token: 'new-token',
        loyaltyPoints: 0,
        isActive: true,
      },
    },
  ]);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'registered',
    token: 'new-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 0,
      isAdmin: true,
    },
  });
});

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

type CustomerCreatePayload = {
  readonly isActive: true;
  readonly loyaltyPoints: 0;
  readonly name: string;
  readonly passwordHash: string;
  readonly phone: string;
  readonly token: string;
};

type CreateCall = {
  readonly data: CustomerCreatePayload;
  readonly entity: typeof Customer;
};

type FakeEntityManagerData = {
  readonly adminUser: AdminUser | null;
  readonly customers: readonly (Customer | null)[];
};

class FakeEntityManager {
  public readonly createCalls: CreateCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls: number = 0;

  public constructor(private readonly data: FakeEntityManagerData) {}

  public create(entity: typeof Customer, data: CustomerCreatePayload): Customer {
    this.createCalls.push({ entity, data });

    return createCustomer('created-customer', data);
  }

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

      return this.data.customers[this.findOneCalls.length - 1] ?? null;
    }

    this.findOneCalls.push({ entity: AdminUser, where });

    return this.data.adminUser;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}

function createCustomer(id: string, data?: CustomerCreatePayload): Customer {
  const customer = new Customer();
  customer.id = id;
  customer.name = data?.name ?? 'Yan';
  customer.phone = data?.phone ?? '81999990000';
  customer.passwordHash = data?.passwordHash ?? 'hash';
  customer.token = data?.token ?? 'old-token';
  customer.loyaltyPoints = data?.loyaltyPoints ?? 0;
  customer.isActive = data?.isActive ?? true;

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
