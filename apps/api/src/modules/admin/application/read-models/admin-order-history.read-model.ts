import type { AdminOrderReadModel } from './admin-order.read-model';

export type AdminOrderDeliveryAddressReadModel = {
  readonly cep: string;
  readonly city: string;
  readonly complement?: string;
  readonly neighborhood: string;
  readonly number: string;
  readonly state: string;
  readonly street: string;
};

export type AdminOrderHistoryOrderReadModel = AdminOrderReadModel & {
  readonly deliveryAddress: AdminOrderDeliveryAddressReadModel | undefined;
};

export type AdminOrderHistoryPageReadModel = {
  readonly data: readonly AdminOrderHistoryOrderReadModel[];
  readonly page: number;
  readonly total: number;
  readonly totalPages: number;
};
