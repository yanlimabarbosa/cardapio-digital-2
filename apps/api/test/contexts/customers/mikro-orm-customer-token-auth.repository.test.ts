import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmCustomerTokenAuthRepository } from '../../../src/modules/customers/adapters/persistence/mikro-orm-customer-token-auth.repository';
import { Customer } from '../../../src/entities';

const VALID_TOKEN = '00000000-0000-4000-8000-000000000001';

test('finds an active customer by token and returns an authenticated read model', async (): Promise<void> => {
  const customer = createCustomer('customer-1');
  const em = new FakeEntityManager(customer);
  const repository = new MikroOrmCustomerTokenAuthRepository(em as unknown as EntityManager);

  const result = await repository.findByToken(VALID_TOKEN);

  assert.deepEqual(em.findOneCalls, [
    {
      entity: Customer,
      where: { token: VALID_TOKEN, isActive: true },
    },
  ]);
  assert.deepEqual(result, { id: 'customer-1' });
});

test('returns null when no active customer exists for the token', async (): Promise<void> => {
  const em = new FakeEntityManager(null);
  const repository = new MikroOrmCustomerTokenAuthRepository(em as unknown as EntityManager);

  const result = await repository.findByToken(VALID_TOKEN);

  assert.equal(result, null);
});

type CustomerTokenFindWhere = {
  readonly isActive: true;
  readonly token: string;
};

type FindOneCall = {
  readonly entity: typeof Customer;
  readonly where: CustomerTokenFindWhere;
};

class FakeEntityManager {
  public readonly findOneCalls: FindOneCall[] = [];

  public constructor(private readonly customer: Customer | null) {}

  public async findOne(
    entity: typeof Customer,
    where: CustomerTokenFindWhere,
  ): Promise<Customer | null> {
    this.findOneCalls.push({ entity, where });

    return this.customer;
  }
}

function createCustomer(id: string): Customer {
  const customer = new Customer();
  customer.id = id;

  return customer;
}
