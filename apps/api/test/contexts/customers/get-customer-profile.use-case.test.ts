import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerProfileNotFoundError } from '../../../src/modules/customers/application/errors/customer.errors';
import type { CustomerProfileReadRepository } from '../../../src/modules/customers/application/ports/customer-profile.read-repository.port';
import type { CustomerProfileReadModel } from '../../../src/modules/customers/application/read-models/customer-profile.read-model';
import { GetCustomerProfileUseCase } from '../../../src/modules/customers/application/use-cases/get-customer-profile.use-case';

test('gets a customer profile through the read repository', async (): Promise<void> => {
  const profile: CustomerProfileReadModel = {
    name: 'Yan',
    phone: '5581999999999',
    hasPassword: true,
    loyaltyPoints: 20,
    isAdmin: true,
    totalOrders: 3,
    memberSince: '2026-05-07T12:00:00.000Z',
  };
  const repository = new FakeCustomerProfileReadRepository(profile);
  const useCase = new GetCustomerProfileUseCase(repository);

  const result = await useCase.execute('customer-1');

  assert.equal(result, profile);
  assert.deepEqual(repository.customerIds, ['customer-1']);
});

test('throws an application error when the customer profile is missing', async (): Promise<void> => {
  const repository = new FakeCustomerProfileReadRepository(null);
  const useCase = new GetCustomerProfileUseCase(repository);

  await assert.rejects(
    () => useCase.execute('missing-customer'),
    CustomerProfileNotFoundError,
  );
});

class FakeCustomerProfileReadRepository implements CustomerProfileReadRepository {
  public readonly customerIds: string[] = [];

  public constructor(private readonly profile: CustomerProfileReadModel | null) {}

  public async getByCustomerId(customerId: string): Promise<CustomerProfileReadModel | null> {
    this.customerIds.push(customerId);

    return this.profile;
  }
}
