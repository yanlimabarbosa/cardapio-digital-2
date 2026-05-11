import type {
  AdminOrderItemExtraReadModel,
  AdminOrderItemGroupedExtraReadModel,
  AdminOrderItemReadModel,
  AdminOrderReadModel,
} from './application/read-models/admin-order.read-model';
import {
  AdminOrderItemExtraResponseDto,
  AdminOrderItemGroupedExtraResponseDto,
  AdminOrderItemResponseDto,
  AdminOrderResponseDto,
} from './dto/response/admin-order-response.dto';

export function toAdminOrderResponseDto(order: AdminOrderReadModel): AdminOrderResponseDto {
  return new AdminOrderResponseDto(
    order.id,
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.status,
    order.totalAmount,
    order.deliveryFee,
    order.paymentMethod,
    order.paymentStatus,
    order.deliveryType,
    order.scheduledFor,
    order.itemCount,
    order.items.map(toAdminOrderItemResponseDto),
    order.createdAt,
  );
}

function toAdminOrderItemResponseDto(item: AdminOrderItemReadModel): AdminOrderItemResponseDto {
  return new AdminOrderItemResponseDto(
    item.id,
    item.productName,
    item.unitPrice,
    item.quantity,
    item.subtotal,
    item.extras?.map(toAdminOrderItemExtraResponseDto),
    item.groupedExtras?.map(toAdminOrderItemGroupedExtraResponseDto) ?? null,
  );
}

function toAdminOrderItemGroupedExtraResponseDto(
  group: AdminOrderItemGroupedExtraReadModel,
): AdminOrderItemGroupedExtraResponseDto {
  return new AdminOrderItemGroupedExtraResponseDto(
    group.groupId,
    group.groupName,
    group.options.map(toAdminOrderItemExtraResponseDto),
  );
}

function toAdminOrderItemExtraResponseDto(
  extra: AdminOrderItemExtraReadModel,
): AdminOrderItemExtraResponseDto {
  return new AdminOrderItemExtraResponseDto(extra.name, extra.price);
}
