import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WS_EVENTS } from '@cardapio/shared';
import { Order } from '../../entities';

function isAllowedLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      /^[0-9.]+$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}

@WebSocketGateway({
  namespace: 'kitchen',
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = new Set((process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((value) => value.trim()).filter(Boolean));
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin) || isAllowedLocalOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin ${origin}`), false);
    },
    credentials: true,
  },
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        this.jwtService.verify(token);
        client.join('admin');
      } catch {
        // Invalid token — allow connection but don't join admin room
      }
    }
  }

  handleDisconnect(_client: Socket) {
    // no-op
  }

  emitNewOrder(order: Order) {
    try {
      // Full order details only to authenticated admin/kitchen clients
      this.server.to('admin').emit(WS_EVENTS.NEW_ORDER, {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        totalAmount: parseFloat(order.totalAmount),
        items: order.items.getItems().map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          subtotal: parseFloat(item.subtotal),
          extras: item.extras,
        })),
        createdAt: order.createdAt!.toISOString(),
      });

      // Minimal data to all clients (for customer order tracking)
      this.server.emit(WS_EVENTS.NEW_ORDER, {
        id: order.id,
        status: order.status,
      });
    } catch (err) {
      console.error('Failed to emit new order via WebSocket:', err);
    }
  }

  emitOrderStatusChanged(order: Order) {
    try {
      // Status changes go to everyone (just ID + status, no PII)
      this.server.emit(WS_EVENTS.ORDER_STATUS_CHANGED, {
        id: order.id,
        status: order.status,
        updatedAt: order.updatedAt!.toISOString(),
      });
    } catch (err) {
      console.error('Failed to emit order status change via WebSocket:', err);
    }
  }
}
