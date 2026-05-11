import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerNotFoundError } from '../../../src/modules/customers/application/errors/customer.errors';
import type {
  CustomerRedeemableProductsReadRepository,
  CustomerRedeemableProductsRecord,
} from '../../../src/modules/customers/application/ports/customer-redeemable-products.read-repository.port';
import { GetCustomerRedeemableProductsUseCase } from '../../../src/modules/customers/application/use-cases/get-customer-redeemable-products.use-case';

test('gets redeemable products and applies loyalty redemption rules', async (): Promise<void> => {
  const repository = new FakeCustomerRedeemableProductsReadRepository({
    balance: 100,
    products: [
      {
        id: 'product-1',
        name: 'Brownie',
        imageUrl: 'https://example.com/brownie.png',
        price: '12.50',
        redemptionCost: 80,
      },
      {
        id: 'product-2',
        name: 'Cafe',
        imageUrl: null,
        price: '8.00',
        redemptionCost: null,
      },
      {
        id: 'product-3',
        name: 'Combo',
        imageUrl: null,
        price: '25.00',
        redemptionCost: 120,
      },
    ],
  });
  const useCase = new GetCustomerRedeemableProductsUseCase(repository);

  const result = await useCase.execute('customer-1');

  assert.deepEqual(repository.customerIds, ['customer-1']);
  assert.deepEqual(result, {
    balance: 100,
    products: [
      {
        id: 'product-1',
        name: 'Brownie',
        imageUrl: 'https://example.com/brownie.png',
        price: 12.5,
        redemptionCost: 80,
        canRedeem: true,
      },
      {
        id: 'product-2',
        name: 'Cafe',
        imageUrl: null,
        price: 8,
        redemptionCost: 0,
        canRedeem: true,
      },
      {
        id: 'product-3',
        name: 'Combo',
        imageUrl: null,
        price: 25,
        redemptionCost: 120,
        canRedeem: false,
      },
    ],
  });
});

test('throws an application error when the customer is missing', async (): Promise<void> => {
  const repository = new FakeCustomerRedeemableProductsReadRepository(null);
  const useCase = new GetCustomerRedeemableProductsUseCase(repository);

  await assert.rejects(
    () => useCase.execute('missing-customer'),
    CustomerNotFoundError,
  );
});

class FakeCustomerRedeemableProductsReadRepository implements CustomerRedeemableProductsReadRepository {
  public readonly customerIds: string[] = [];

  public constructor(private readonly result: CustomerRedeemableProductsRecord | null) {}

  public async getByCustomerId(customerId: string): Promise<CustomerRedeemableProductsRecord | null> {
    this.customerIds.push(customerId);

    return this.result;
  }
}
