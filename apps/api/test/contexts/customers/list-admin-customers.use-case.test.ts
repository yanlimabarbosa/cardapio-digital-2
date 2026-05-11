import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminCustomerReadRepository } from '../../../src/modules/customers/application/ports/admin-customer.read-repository.port';
import type { AdminCustomerReadModel } from '../../../src/modules/customers/application/read-models/admin-customer.read-model';
import { ListAdminCustomersUseCase } from '../../../src/modules/customers/application/use-cases/list-admin-customers.use-case';

test('lists admin customers through the read repository', async (): Promise<void> => {
  const customers: readonly AdminCustomerReadModel[] = [
    {
      name: 'Yan',
      phone: '5581999999999',
      hasPassword: true,
      loyaltyPoints: 20,
      isAdmin: false,
      totalOrders: 3,
      memberSince: '2026-05-07T12:00:00.000Z',
    },
  ];
  const repository = new FakeAdminCustomerReadRepository(customers);
  const useCase = new ListAdminCustomersUseCase(repository);

  const result = await useCase.execute('9999');

  assert.equal(result, customers);
  assert.deepEqual(repository.listCalls, ['9999']);
});

class FakeAdminCustomerReadRepository implements AdminCustomerReadRepository {
  public readonly listCalls: Array<string | undefined> = [];

  public constructor(private readonly customers: readonly AdminCustomerReadModel[]) {}

  public async list(search?: string): Promise<readonly AdminCustomerReadModel[]> {
    this.listCalls.push(search);

    return this.customers;
  }
}
