import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import { CustomerNotFoundError } from '../../../src/modules/customers/application/errors/customer.errors';
import type {
  CustomerOrderHistoryReadRepository,
  GetCustomerOrderHistoryReadQuery,
} from '../../../src/modules/customers/application/ports/customer-order-history.read-repository.port';
import type { CustomerOrderHistoryPageReadModel } from '../../../src/modules/customers/application/read-models/customer-order-history.read-model';
import { GetCustomerOrderHistoryUseCase } from '../../../src/modules/customers/application/use-cases/get-customer-order-history.use-case';

test('gets customer order history through the read repository', async (): Promise<void> => {
  const page: CustomerOrderHistoryPageReadModel = {
    orders: [
      {
        id: 'order-1',
        orderNumber: 42,
        customerName: 'Yan',
        status: OrderStatus.PAID,
        totalAmount: 25,
        deliveryFee: 5,
        paymentMethod: PaymentMethod.PIX,
        paymentStatus: PaymentStatus.APPROVED,
        deliveryType: 'delivery',
        scheduledFor: '2026-05-07T15:00:00.000Z',
        items: [
          {
            id: 'item-1',
            productName: 'Quentinha',
            unitPrice: 17,
            quantity: 1,
            subtotal: 20,
            extras: [{ name: 'Farofa', price: 3 }],
          },
        ],
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    ],
    total: 3,
    page: 2,
    totalPages: 2,
  };
  const repository = new FakeCustomerOrderHistoryReadRepository(page);
  const useCase = new GetCustomerOrderHistoryUseCase(repository);

  const result = await useCase.execute({
    customerId: 'customer-1',
    page: 2,
    limit: 2,
  });

  assert.deepEqual(repository.queries, [
    {
      customerId: 'customer-1',
      page: 2,
      limit: 2,
    },
  ]);
  assert.deepEqual(result, page);
});

test('throws an application error when the customer is missing', async (): Promise<void> => {
  const repository = new FakeCustomerOrderHistoryReadRepository(null);
  const useCase = new GetCustomerOrderHistoryUseCase(repository);

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

class FakeCustomerOrderHistoryReadRepository implements CustomerOrderHistoryReadRepository {
  public readonly queries: GetCustomerOrderHistoryReadQuery[] = [];

  public constructor(private readonly result: CustomerOrderHistoryPageReadModel | null) {}

  public async getByCustomerId(
    query: GetCustomerOrderHistoryReadQuery,
  ): Promise<CustomerOrderHistoryPageReadModel | null> {
    this.queries.push(query);

    return this.result;
  }
}
