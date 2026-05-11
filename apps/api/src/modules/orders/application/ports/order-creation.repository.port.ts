import type { OrderStatus, PaymentMethod } from '@cardapio/shared';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type { OrderReadModel } from '../read-models/order.read-model';

export const ORDER_CREATION_REPOSITORY = Symbol('ORDER_CREATION_REPOSITORY');

export type CreateOrderDeliveryAddressInput = {
  readonly cep: string;
  readonly city: string;
  readonly complement?: string;
  readonly neighborhood: string;
  readonly number: string;
  readonly state: string;
  readonly street: string;
};

export type CreateOrderItemExtraInput = {
  readonly name: string;
  readonly price: number;
};

export type CreateOrderItemGroupedExtraInput = {
  readonly groupId: string;
  readonly groupName: string;
  readonly options: readonly CreateOrderItemExtraInput[];
};

export type CreateOrderItemPersistenceInput = {
  readonly extras: readonly CreateOrderItemExtraInput[];
  readonly groupedExtras: readonly CreateOrderItemGroupedExtraInput[];
  readonly isRedeemed: boolean;
  readonly pointsSpent: number;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly subtotal: string;
  readonly unitPrice: string;
};

export type CreateOrderPersistenceCommand = {
  readonly context?: TransactionContext;
  readonly couponCode?: string;
  readonly couponId?: string;
  readonly customerEmail?: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly deliveryAddress?: CreateOrderDeliveryAddressInput;
  readonly deliveryFee?: string;
  readonly deliveryType: 'pickup' | 'delivery';
  readonly discountAmount?: string;
  readonly items: readonly CreateOrderItemPersistenceInput[];
  readonly notes?: string;
  readonly orderNumber: number;
  readonly paymentMethod: PaymentMethod;
  readonly pointsSpent: number;
  readonly scheduledFor?: Date;
  readonly status: OrderStatus;
  readonly totalAmount: string;
};

export type CreateOrderPersistenceResult = {
  readonly order: OrderReadModel;
  readonly orderId: string;
  readonly orderNumber: number;
};

export interface OrderCreationRepository {
  create(command: CreateOrderPersistenceCommand): Promise<CreateOrderPersistenceResult>;
}
