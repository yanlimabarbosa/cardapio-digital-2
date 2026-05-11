import { Logger } from '@nestjs/common';
import { WS_EVENTS } from '@cardapio/shared';
import { KitchenGateway } from '../../../../modules/websocket/websocket.gateway';
import type {
  OrderRealtimeNotifier,
  OrderStatusChangedNotification,
} from '../../application/ports/order-realtime-notifier.port';

export class SocketIoOrderRealtimeNotifier implements OrderRealtimeNotifier {
  private readonly logger = new Logger(SocketIoOrderRealtimeNotifier.name);

  public constructor(private readonly kitchenGateway: KitchenGateway) {}

  public async orderStatusChanged(notification: OrderStatusChangedNotification): Promise<void> {
    try {
      this.kitchenGateway.server.emit(WS_EVENTS.ORDER_STATUS_CHANGED, notification);
    } catch (error: unknown) {
      this.logger.error('Failed to emit order status change via WebSocket', error);
    }
  }
}
