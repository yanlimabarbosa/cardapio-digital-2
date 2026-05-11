import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerNotFoundError } from '../../../src/modules/customers/application/errors/customer.errors';
import type {
  CustomerLoyaltyReadRepository,
  GetCustomerLoyaltyReadQuery,
} from '../../../src/modules/customers/application/ports/customer-loyalty.read-repository.port';
import type { CustomerLoyaltyReadModel } from '../../../src/modules/customers/application/read-models/customer-loyalty.read-model';
import { GetCustomerLoyaltyUseCase } from '../../../src/modules/customers/application/use-cases/get-customer-loyalty.use-case';

test('gets customer loyalty through the read repository', async (): Promise<void> => {
  const loyalty: CustomerLoyaltyReadModel = {
    balance: 30,
    transactions: [
      {
        id: 'transaction-1',
        points: 10,
        type: 'earn',
        description: 'Pedido #1',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    ],
    total: 1,
    page: 2,
    totalPages: 3,
  };
  const repository = new FakeCustomerLoyaltyReadRepository(loyalty);
  const useCase = new GetCustomerLoyaltyUseCase(repository);

  const result = await useCase.execute({
    customerId: 'customer-1',
    page: 2,
    limit: 10,
  });

  assert.equal(result, loyalty);
  assert.deepEqual(repository.queries, [
    {
      customerId: 'customer-1',
      page: 2,
      limit: 10,
    },
  ]);
});

test('throws an application error when the customer is missing', async (): Promise<void> => {
  const repository = new FakeCustomerLoyaltyReadRepository(null);
  const useCase = new GetCustomerLoyaltyUseCase(repository);

  await assert.rejects(
    () =>
      useCase.execute({
        customerId: 'missing-customer',
        page: 1,
        limit: 10,
      }),
    CustomerNotFoundError,
  );
});

class FakeCustomerLoyaltyReadRepository implements CustomerLoyaltyReadRepository {
  public readonly queries: GetCustomerLoyaltyReadQuery[] = [];

  public constructor(private readonly loyalty: CustomerLoyaltyReadModel | null) {}

  public async getByCustomerId(
    query: GetCustomerLoyaltyReadQuery,
  ): Promise<CustomerLoyaltyReadModel | null> {
    this.queries.push(query);

    return this.loyalty;
  }
}
