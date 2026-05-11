import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod } from '@cardapio/shared';
import { GetKitchenOrdersUseCase } from '../../../src/modules/orders/application/use-cases/get-kitchen-orders.use-case';
import { GetOrderDetailsUseCase } from '../../../src/modules/orders/application/use-cases/get-order-details.use-case';
import type { OrderReadRepository } from '../../../src/modules/orders/application/ports/order-read-repository.port';
import type { OrderReadModel } from '../../../src/modules/orders/application/read-models/order.read-model';

type OrderReadCall =
  | {
    readonly method: 'getKitchenOrders';
  }
  | {
    readonly method: 'getOrderDetails';
    readonly id: string;
  };

test('reads kitchen orders through the order read repository', async (): Promise<void> => {
  const orderReadRepository = new FakeOrderReadRepository();
  const useCase = new GetKitchenOrdersUseCase(orderReadRepository);

  const result = await useCase.execute();

  assert.deepEqual(result, [sampleOrder]);
  assert.deepEqual(orderReadRepository.calls, [{ method: 'getKitchenOrders' }]);
});

test('reads order details through the order read repository', async (): Promise<void> => {
  const orderReadRepository = new FakeOrderReadRepository();
  const useCase = new GetOrderDetailsUseCase(orderReadRepository);

  const result = await useCase.execute({ id: 'order-1' });

  assert.equal(result, sampleOrder);
  assert.deepEqual(orderReadRepository.calls, [{ method: 'getOrderDetails', id: 'order-1' }]);
});

class FakeOrderReadRepository implements OrderReadRepository {
  public readonly calls: OrderReadCall[] = [];

  public async getKitchenOrders(): Promise<readonly OrderReadModel[]> {
    this.calls.push({ method: 'getKitchenOrders' });
    return [sampleOrder];
  }

  public async getOrderDetails(id: string): Promise<OrderReadModel> {
    this.calls.push({ method: 'getOrderDetails', id });
    return sampleOrder;
  }
}

const sampleOrder: OrderReadModel = {
  id: 'order-1',
  orderNumber: 1,
  customerName: 'Cliente Teste',
  customerPhone: '81999999999',
  status: OrderStatus.PAID,
  totalAmount: 10,
  couponCode: null,
  discountAmount: null,
  deliveryFee: null,
  paymentMethod: PaymentMethod.PIX,
  deliveryType: 'pickup',
  scheduledFor: null,
  items: [],
  createdAt: '2026-05-06T12:00:00.000Z',
  updatedAt: '2026-05-06T12:00:00.000Z',
};
