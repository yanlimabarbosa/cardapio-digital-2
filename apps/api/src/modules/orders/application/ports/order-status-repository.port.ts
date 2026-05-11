import type { OrderStatus } from '@cardapio/shared';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type { OrderReadModel } from '../read-models/order.read-model';
import type { OrderStatusChangedNotification } from './order-realtime-notifier.port';

export type OrderStatusChangeCustomer = {
  readonly id: string;
  readonly isRegistered: boolean;
  readonly loyaltyPoints: number;
  readonly phone: string;
};

export type OrderStatusChangeTarget = {
  readonly customer: OrderStatusChangeCustomer | null;
  readonly deliveryFeeCents: number;
  readonly id: string;
  readonly orderNumber: number;
  readonly status?: OrderStatus;
  readonly totalCents: number;
};

export type FindOrderForStatusChangeQuery = {
  readonly context: TransactionContext;
  readonly id: string;
};

export type SaveOrderStatusChangeCommand = {
  readonly context: TransactionContext;
  readonly id: string;
  readonly status: OrderStatus;
};

export type GetOrderStatusChangeResultQuery = {
  readonly context: TransactionContext;
  readonly id: string;
};

export type GetLoyaltyPointsPerRealQuery = {
  readonly context: TransactionContext;
};

export type CreditDeliveredOrderLoyaltyCommand = {
  readonly context: TransactionContext;
  readonly customerId: string;
  readonly customerPhone: string;
  readonly orderId: string;
  readonly orderNumber: number;
  readonly pointsEarned: number;
};

export type CreditDeliveredOrderLoyaltyResult = {
  readonly credited: boolean;
  readonly pointsEarned: number;
};

export type OrderStatusChangePersistenceResult = {
  readonly notification: OrderStatusChangedNotification;
  readonly order: OrderReadModel;
};

export interface OrderStatusRepository {
  findForStatusChange(query: FindOrderForStatusChangeQuery): Promise<OrderStatusChangeTarget | null>;
  saveStatus(command: SaveOrderStatusChangeCommand): Promise<void>;
  getStatusChangeResult(query: GetOrderStatusChangeResultQuery): Promise<OrderStatusChangePersistenceResult>;
  getLoyaltyPointsPerReal(query: GetLoyaltyPointsPerRealQuery): Promise<number>;
  creditDeliveredOrderLoyalty(
    command: CreditDeliveredOrderLoyaltyCommand,
  ): Promise<CreditDeliveredOrderLoyaltyResult>;
}
