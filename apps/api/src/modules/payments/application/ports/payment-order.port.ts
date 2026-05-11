import type { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import type { GatewayPaymentStatus } from '../../domain/payment-status.policy';

export const PAYMENT_ORDER_REPOSITORY = Symbol('PAYMENT_ORDER_REPOSITORY');

export type PaymentOrderDeliveryAddress = {
  readonly cep: string;
  readonly city: string;
  readonly complement?: string;
  readonly neighborhood: string;
  readonly number: string;
  readonly state: string;
  readonly street: string;
};

export type PaymentOrderItemExtra = {
  readonly name: string;
  readonly price: number;
};

export type PaymentOrderItem = {
  readonly extras?: readonly PaymentOrderItemExtra[];
  readonly productName: string;
  readonly quantity: number;
  readonly subtotal: number;
};

export type PaymentOrder = {
  readonly createdAt: Date;
  readonly customerEmail?: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly deliveryAddress?: PaymentOrderDeliveryAddress;
  readonly id: string;
  readonly items: readonly PaymentOrderItem[];
  readonly orderNumber: number;
  readonly paymentId?: string;
  readonly paymentMethod: PaymentMethod;
  readonly paymentStatus?: PaymentStatus;
  readonly status?: OrderStatus;
  readonly totalAmount: string;
  readonly updatedAt: Date;
};

export type FindPaymentOrderQuery = {
  readonly orderId: string;
};

export type MarkPaymentPendingCommand = {
  readonly orderId: string;
  readonly paymentId: string;
};

export type ApplyPaymentGatewayStatusCommand = {
  readonly orderId: string;
  readonly paymentId?: string;
  readonly status: GatewayPaymentStatus;
};

export type ApplyQueuedPaymentResultCommand = {
  readonly paymentId: string;
  readonly referenceId?: string;
  readonly status: GatewayPaymentStatus;
};

export type PaymentNewOrderNotification = {
  readonly createdAt: string;
  readonly customerName: string;
  readonly id: string;
  readonly items: readonly PaymentNewOrderNotificationItem[];
  readonly orderNumber: number;
  readonly status: OrderStatus;
  readonly totalAmount: number;
};

export type PaymentNewOrderNotificationItem = {
  readonly extras?: readonly PaymentOrderItemExtra[];
  readonly productName: string;
  readonly quantity: number;
  readonly subtotal: number;
};

export type ApplyPaymentGatewayStatusResult = {
  readonly newOrderNotification: PaymentNewOrderNotification | null;
  readonly order: PaymentOrder;
};

export type ApplyQueuedPaymentResultResult =
  | {
    readonly newOrderNotification: PaymentNewOrderNotification | null;
    readonly order: PaymentOrder;
    readonly processed: true;
    readonly status: GatewayPaymentStatus;
  }
  | {
    readonly order: PaymentOrder;
    readonly reason?: string;
    readonly skipped: true;
  };

export interface PaymentOrderRepository {
  findById(query: FindPaymentOrderQuery): Promise<PaymentOrder | null>;
  markPaymentPending(command: MarkPaymentPendingCommand): Promise<PaymentOrder>;
  applyGatewayStatus(command: ApplyPaymentGatewayStatusCommand): Promise<ApplyPaymentGatewayStatusResult>;
  applyQueuedPaymentResult(command: ApplyQueuedPaymentResultCommand): Promise<ApplyQueuedPaymentResultResult>;
}
