import type { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';

export type AdminOrderItemExtraReadModel = {
  readonly name: string;
  readonly price: number;
};

export type AdminOrderItemGroupedExtraReadModel = {
  readonly groupId: string;
  readonly groupName: string;
  readonly options: readonly AdminOrderItemExtraReadModel[];
};

export type AdminOrderItemReadModel = {
  readonly extras: readonly AdminOrderItemExtraReadModel[] | undefined;
  readonly groupedExtras: readonly AdminOrderItemGroupedExtraReadModel[] | null;
  readonly id: string;
  readonly productName: string;
  readonly quantity: number;
  readonly subtotal: number;
  readonly unitPrice: number;
};

export type AdminOrderReadModel = {
  readonly createdAt: Date | undefined;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly deliveryFee: number | null;
  readonly deliveryType: string;
  readonly id: string;
  readonly itemCount: number;
  readonly items: readonly AdminOrderItemReadModel[];
  readonly orderNumber: number;
  readonly paymentMethod: PaymentMethod;
  readonly paymentStatus: PaymentStatus | undefined;
  readonly scheduledFor: string | null;
  readonly status: OrderStatus | undefined;
  readonly totalAmount: number;
};
