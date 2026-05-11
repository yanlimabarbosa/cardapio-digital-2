import type {
  AdminOrderDeliveryAddressReadModel,
  AdminOrderHistoryOrderReadModel,
  AdminOrderHistoryPageReadModel,
} from './application/read-models/admin-order-history.read-model';
import {
  AdminOrderDeliveryAddressResponseDto,
  AdminOrderHistoryOrderResponseDto,
  AdminOrderHistoryResponseDto,
} from './dto/response/admin-order-history-response.dto';
import { toAdminOrderResponseDto } from './admin-order.mapper';

export function toAdminOrderHistoryResponseDto(
  page: AdminOrderHistoryPageReadModel,
): AdminOrderHistoryResponseDto {
  return new AdminOrderHistoryResponseDto(
    page.data.map(toAdminOrderHistoryOrderResponseDto),
    page.total,
    page.page,
    page.totalPages,
  );
}

function toAdminOrderHistoryOrderResponseDto(
  order: AdminOrderHistoryOrderReadModel,
): AdminOrderHistoryOrderResponseDto {
  const base = toAdminOrderResponseDto(order);

  return new AdminOrderHistoryOrderResponseDto(
    base.id,
    base.orderNumber,
    base.customerName,
    base.customerPhone,
    base.status,
    base.totalAmount,
    base.deliveryFee,
    base.paymentMethod,
    base.paymentStatus,
    base.deliveryType,
    toAdminOrderDeliveryAddressResponseDto(order.deliveryAddress),
    base.scheduledFor,
    base.itemCount,
    base.items,
    base.createdAt,
  );
}

function toAdminOrderDeliveryAddressResponseDto(
  address: AdminOrderDeliveryAddressReadModel | undefined,
): AdminOrderDeliveryAddressResponseDto | undefined {
  if (!address) {
    return undefined;
  }

  return new AdminOrderDeliveryAddressResponseDto(
    address.cep,
    address.street,
    address.number,
    address.complement,
    address.neighborhood,
    address.city,
    address.state,
  );
}
