import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import type { AdminOrderHistoryPageReadModel } from '../../../src/modules/admin/application/read-models/admin-order-history.read-model';
import { toAdminOrderHistoryResponseDto } from '../../../src/modules/admin/admin-order-history.mapper';
import {
  AdminOrderDeliveryAddressResponseDto,
  AdminOrderHistoryOrderResponseDto,
  AdminOrderHistoryResponseDto,
} from '../../../src/modules/admin/dto/response/admin-order-history-response.dto';
import { AdminOrderItemResponseDto } from '../../../src/modules/admin/dto/response/admin-order-response.dto';

test('maps admin order history pages to response DTOs', (): void => {
  const createdAt = new Date('2026-05-07T12:00:00.000Z');
  const page: AdminOrderHistoryPageReadModel = {
    data: [
      {
        id: 'order-1',
        orderNumber: 42,
        customerName: 'Yan',
        customerPhone: '81999999999',
        status: OrderStatus.DELIVERED,
        totalAmount: 25,
        deliveryFee: 5,
        paymentMethod: PaymentMethod.PIX,
        paymentStatus: PaymentStatus.APPROVED,
        deliveryType: 'delivery',
        deliveryAddress: {
          cep: '50000-000',
          street: 'Rua Um',
          number: '42',
          complement: 'Apto 1',
          neighborhood: 'Centro',
          city: 'Recife',
          state: 'PE',
        },
        scheduledFor: '2026-05-07T15:00:00.000Z',
        itemCount: 1,
        items: [
          {
            id: 'item-1',
            productName: 'Quentinha',
            unitPrice: 17,
            quantity: 1,
            subtotal: 20,
            extras: [{ name: 'Farofa', price: 3 }],
            groupedExtras: null,
          },
        ],
        createdAt,
      },
    ],
    total: 1,
    page: 1,
    totalPages: 1,
  };

  const result = toAdminOrderHistoryResponseDto(page);

  assert.ok(result instanceof AdminOrderHistoryResponseDto);
  assert.ok(result.data[0] instanceof AdminOrderHistoryOrderResponseDto);
  assert.ok(result.data[0]?.deliveryAddress instanceof AdminOrderDeliveryAddressResponseDto);
  assert.ok(result.data[0]?.items[0] instanceof AdminOrderItemResponseDto);
  assert.equal(result.total, 1);
  assert.equal(result.page, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.data[0]?.id, 'order-1');
  assert.equal(result.data[0]?.deliveryAddress?.street, 'Rua Um');
  assert.equal(result.data[0]?.items[0]?.productName, 'Quentinha');
  assert.equal(result.data[0]?.createdAt, createdAt);
});
