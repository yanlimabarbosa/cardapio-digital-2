import type { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';

export type OrderDeliveryAddressReadModel = {
  readonly cep: string;
  readonly city: string;
  readonly complement?: string;
  readonly neighborhood: string;
  readonly number: string;
  readonly state: string;
  readonly street: string;
};

export type OrderItemExtraReadModel = {
  readonly name: string;
  readonly price: number;
};

export type OrderItemGroupedExtraReadModel = {
  readonly groupId: string;
  readonly groupName: string;
  readonly options: readonly OrderItemExtraReadModel[];
};

export type OrderItemReadModel = {
  readonly extras?: readonly OrderItemExtraReadModel[];
  readonly groupedExtras: readonly OrderItemGroupedExtraReadModel[] | null;
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly subtotal: number;
  readonly unitPrice: number;
};

export type OrderReadModel = {
  readonly couponCode: string | null;
  readonly createdAt: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly deliveryAddress?: OrderDeliveryAddressReadModel;
  readonly deliveryFee: number | null;
  readonly deliveryType: string;
  readonly discountAmount: number | null;
  readonly id: string;
  readonly items: readonly OrderItemReadModel[];
  readonly notes?: string;
  readonly orderNumber: number;
  readonly paymentMethod: PaymentMethod;
  readonly paymentStatus?: PaymentStatus;
  readonly scheduledFor: string | null;
  readonly status?: OrderStatus;
  readonly totalAmount: number;
  readonly updatedAt: string;
};
