import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import type { AdminOrderReadModel } from '../../../src/modules/admin/application/read-models/admin-order.read-model';
import { toAdminOrderResponseDto } from '../../../src/modules/admin/admin-order.mapper';
import {
  AdminOrderItemExtraResponseDto,
  AdminOrderItemGroupedExtraResponseDto,
  AdminOrderItemResponseDto,
  AdminOrderResponseDto,
} from '../../../src/modules/admin/dto/response/admin-order-response.dto';

test('maps admin order read models to response DTOs', (): void => {
  const createdAt = new Date('2026-05-07T12:00:00.000Z');
  const readModel: AdminOrderReadModel = {
    id: 'order-1',
    orderNumber: 42,
    customerName: 'Yan',
    customerPhone: '81999999999',
    status: OrderStatus.PAID,
    totalAmount: 25,
    deliveryFee: 5,
    paymentMethod: PaymentMethod.PIX,
    paymentStatus: PaymentStatus.APPROVED,
    deliveryType: 'delivery',
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
        groupedExtras: [
          {
            groupId: 'group-1',
            groupName: 'Carne',
            options: [{ name: 'Bife', price: 3 }],
          },
        ],
      },
    ],
    createdAt,
  };

  const result = toAdminOrderResponseDto(readModel);

  assert.ok(result instanceof AdminOrderResponseDto);
  assert.ok(result.items[0] instanceof AdminOrderItemResponseDto);
  assert.ok(result.items[0]?.extras?.[0] instanceof AdminOrderItemExtraResponseDto);
  assert.ok(result.items[0]?.groupedExtras?.[0] instanceof AdminOrderItemGroupedExtraResponseDto);
  assert.equal(result.id, 'order-1');
  assert.equal(result.orderNumber, 42);
  assert.equal(result.customerName, 'Yan');
  assert.equal(result.customerPhone, '81999999999');
  assert.equal(result.status, OrderStatus.PAID);
  assert.equal(result.totalAmount, 25);
  assert.equal(result.deliveryFee, 5);
  assert.equal(result.paymentMethod, PaymentMethod.PIX);
  assert.equal(result.paymentStatus, PaymentStatus.APPROVED);
  assert.equal(result.deliveryType, 'delivery');
  assert.equal(result.scheduledFor, '2026-05-07T15:00:00.000Z');
  assert.equal(result.itemCount, 1);
  assert.equal(result.items[0]?.productName, 'Quentinha');
  assert.equal(result.items[0]?.extras?.[0]?.name, 'Farofa');
  assert.equal(result.items[0]?.groupedExtras?.[0]?.options[0]?.name, 'Bife');
  assert.equal(result.createdAt, createdAt);
});
