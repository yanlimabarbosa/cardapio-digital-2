import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import type {
  AdminOrderReadRepository,
  ListAdminOrderHistoryReadQuery,
} from '../../../src/modules/admin/application/ports/admin-order.read-repository.port';
import type { AdminOrderHistoryPageReadModel } from '../../../src/modules/admin/application/read-models/admin-order-history.read-model';
import type { AdminOrderReadModel } from '../../../src/modules/admin/application/read-models/admin-order.read-model';
import { ListAdminOrderHistoryUseCase } from '../../../src/modules/admin/application/use-cases/list-admin-order-history.use-case';

test('lists admin order history with legacy pagination defaults', async (): Promise<void> => {
  const page = createHistoryPage();
  const orders = new FakeAdminOrderReadRepository(page);
  const useCase = new ListAdminOrderHistoryUseCase(orders);

  const result = await useCase.execute();

  assert.equal(result, page);
  assert.deepEqual(orders.listHistoryCalls, [
    {
      page: 1,
      limit: 20,
      search: undefined,
      status: undefined,
      from: undefined,
      to: undefined,
    },
  ]);
});

test('caps admin order history limit and forwards filters', async (): Promise<void> => {
  const page = createHistoryPage();
  const orders = new FakeAdminOrderReadRepository(page);
  const useCase = new ListAdminOrderHistoryUseCase(orders);

  await useCase.execute({
    page: 3,
    limit: 250,
    search: '42',
    status: 'delivered',
    from: '2026-05-01',
    to: '2026-05-07',
  });

  assert.deepEqual(orders.listHistoryCalls, [
    {
      page: 3,
      limit: 100,
      search: '42',
      status: 'delivered',
      from: '2026-05-01',
      to: '2026-05-07',
    },
  ]);
});

function createHistoryPage(): AdminOrderHistoryPageReadModel {
  return {
    data: [
      {
        id: 'order-1',
        orderNumber: 42,
        customerName: 'Yan',
        customerPhone: '81999999999',
        status: OrderStatus.DELIVERED,
        totalAmount: 25,
        deliveryFee: null,
        paymentMethod: PaymentMethod.PIX,
        paymentStatus: PaymentStatus.APPROVED,
        deliveryType: 'pickup',
        deliveryAddress: undefined,
        scheduledFor: null,
        itemCount: 0,
        items: [],
        createdAt: new Date('2026-05-07T12:00:00.000Z'),
      },
    ],
    total: 1,
    page: 1,
    totalPages: 1,
  };
}

class FakeAdminOrderReadRepository implements AdminOrderReadRepository {
  public readonly listHistoryCalls: ListAdminOrderHistoryReadQuery[] = [];

  public constructor(private readonly page: AdminOrderHistoryPageReadModel) {}

  public async list(): Promise<readonly AdminOrderReadModel[]> {
    throw new Error('list was not expected in this test');
  }

  public async listHistory(
    query: ListAdminOrderHistoryReadQuery,
  ): Promise<AdminOrderHistoryPageReadModel> {
    this.listHistoryCalls.push(query);

    return this.page;
  }
}
