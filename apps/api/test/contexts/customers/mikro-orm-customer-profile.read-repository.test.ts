import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCustomerProfileReadRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-profile.read-repository';
import { AdminUser, Customer, Order } from '../../../src/entities';

test('gets a customer profile with order count and admin flag', async (): Promise<void> => {
  const customer = createCustomer('customer-1', {
    name: 'Yan',
    phone: '5581999999999',
    passwordHash: 'hash',
    loyaltyPoints: 20,
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
  });
  const admin = createAdminUser('admin-1', '5581999999999');
  const em = new FakeEntityManager(customer, admin, 3);
  const repository = new MikroOrmCustomerProfileReadRepository(em as unknown as EntityManager);

  const result = await repository.getByCustomerId('customer-1');

  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { id: 'customer-1', isActive: true },
    },
    {
      entity: AdminUser,
      where: { phone: '5581999999999' },
    },
  ]);
  assert.deepEqual(em.countCalls, [
    { entity: Order, where: { customer } },
  ]);
  assert.deepEqual(result, {
    name: 'Yan',
    phone: '5581999999999',
    hasPassword: true,
    loyaltyPoints: 20,
    isAdmin: true,
    totalOrders: 3,
    memberSince: '2026-05-07T12:00:00.000Z',
  });
});

test('does not check admin users when the customer has no password', async (): Promise<void> => {
  const customer = createCustomer('customer-1', {
    name: 'Yan',
    phone: '5581999999999',
    passwordHash: undefined,
    loyaltyPoints: 20,
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
  });
  const em = new FakeEntityManager(customer, createAdminUser('admin-1', '5581999999999'), 3);
  const repository = new MikroOrmCustomerProfileReadRepository(em as unknown as EntityManager);

  const result = await repository.getByCustomerId('customer-1');

  assert.equal(result?.isAdmin, false);
  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { id: 'customer-1', isActive: true },
    },
  ]);
});

test('returns null when the active customer profile is missing', async (): Promise<void> => {
  const em = new FakeEntityManager(null, null, 0);
  const repository = new MikroOrmCustomerProfileReadRepository(em as unknown as EntityManager);

  const result = await repository.getByCustomerId('missing-customer');

  assert.equal(result, null);
  assert.deepEqual(em.countCalls, []);
});

type CustomerCreateData = {
  readonly createdAt: Date;
  readonly loyaltyPoints: number;
  readonly name: string;
  readonly passwordHash: string | undefined;
  readonly phone: string;
};

type CustomerFindWhere = {
  readonly id: string;
  readonly isActive: true;
};

type AdminUserFindWhere = {
  readonly phone: string;
};

type FindOneCall =
  | {
      readonly entity: typeof Customer;
      readonly where: CustomerFindWhere;
    }
  | {
      readonly entity: typeof AdminUser;
      readonly where: AdminUserFindWhere;
    };

type CountCall = {
  readonly entity: typeof Order;
  readonly where: {
    readonly customer: Customer;
  };
};

class FakeEntityManager {
  public readonly countCalls: CountCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];

  public constructor(
    private readonly customer: Customer | null,
    private readonly adminUser: AdminUser | null,
    private readonly orderCount: number,
  ) {}

  public async findOne(
    entity: typeof Customer,
    where: CustomerFindWhere,
  ): Promise<Customer | null>;
  public async findOne(
    entity: typeof AdminUser,
    where: AdminUserFindWhere,
  ): Promise<AdminUser | null>;
  public async findOne(
    entity: typeof Customer | typeof AdminUser,
    where: CustomerFindWhere | AdminUserFindWhere,
  ): Promise<Customer | AdminUser | null> {
    if (entity === Customer) {
      this.findOneCalls.push({ entity: Customer, where: where as CustomerFindWhere });

      return this.customer;
    }

    this.findOneCalls.push({ entity: AdminUser, where: where as AdminUserFindWhere });

    return this.adminUser;
  }

  public async count(
    entity: typeof Order,
    where: CountCall['where'],
  ): Promise<number> {
    this.countCalls.push({ entity, where });

    return this.orderCount;
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

function createAdminUser(id: string, phone: string): AdminUser {
  const admin = new AdminUser();
  admin.id = id;
  admin.email = 'admin@example.com';
  admin.passwordHash = 'hash';
  admin.name = 'Admin';
  admin.phone = phone;

  return admin;
}
