import type { OrderStatus } from '@cardapio/shared';

export type OrderStatusChangedNotification = {
  readonly id: string;
  readonly status: OrderStatus;
  readonly updatedAt: string;
};

export interface OrderRealtimeNotifier {
  orderStatusChanged(notification: OrderStatusChangedNotification): Promise<void>;
}
