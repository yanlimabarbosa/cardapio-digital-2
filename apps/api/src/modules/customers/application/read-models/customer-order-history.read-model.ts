import type { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';

export type CustomerOrderItemExtraReadModel = {
  readonly name: string;
  readonly price: number;
};

export type CustomerOrderItemReadModel = {
  readonly extras: readonly CustomerOrderItemExtraReadModel[] | null | undefined;
  readonly id: string;
  readonly productName: string;
  readonly quantity: number;
  readonly subtotal: number;
  readonly unitPrice: number;
};

export type CustomerOrderHistoryOrderReadModel = {
  readonly createdAt: string;
  readonly customerName: string;
  readonly deliveryFee: number | null;
  readonly deliveryType: string;
  readonly id: string;
  readonly items: readonly CustomerOrderItemReadModel[];
  readonly orderNumber: number;
  readonly paymentMethod: PaymentMethod;
  readonly paymentStatus: PaymentStatus | undefined;
  readonly scheduledFor: string | null;
  readonly status: OrderStatus | undefined;
  readonly totalAmount: number;
};

export type CustomerOrderHistoryPageReadModel = {
  readonly orders: readonly CustomerOrderHistoryOrderReadModel[];
  readonly page: number;
  readonly total: number;
  readonly totalPages: number;
};
