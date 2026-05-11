import { Logger } from '@nestjs/common';
import { WS_EVENTS } from '@cardapio/shared';
import { KitchenGateway } from '../../../../modules/websocket/websocket.gateway';
import type { PaymentRealtimeNotifier } from '../../application/ports/payment-realtime-notifier.port';
import type { PaymentNewOrderNotification } from '../../application/ports/payment-order.port';

export class SocketIoPaymentRealtimeNotifier implements PaymentRealtimeNotifier {
  private readonly logger = new Logger(SocketIoPaymentRealtimeNotifier.name);

  public constructor(private readonly kitchenGateway: KitchenGateway) {}

  public async newOrderPaid(notification: PaymentNewOrderNotification): Promise<void> {
    try {
      this.kitchenGateway.server.to('admin').emit(WS_EVENTS.NEW_ORDER, notification);
      this.kitchenGateway.server.emit(WS_EVENTS.NEW_ORDER, {
        id: notification.id,
        status: notification.status,
      });
    } catch (error: unknown) {
      this.logger.error('Failed to emit paid order via WebSocket', error);
    }
  }
}
