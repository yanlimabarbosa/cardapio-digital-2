import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, WS_EVENTS } from '@cardapio/shared';
import { SocketIoPaymentRealtimeNotifier } from '../../../src/modules/payments/adapters/realtime/socket-io-payment-realtime.notifier';
import type { PaymentNewOrderNotification } from '../../../src/modules/payments/application/ports/payment-order.port';
import type { KitchenGateway } from '../../../src/modules/websocket/websocket.gateway';

type EmitCall = {
  readonly event: string;
  readonly payload: unknown;
  readonly room: string | null;
};

test('emits paid order details to admin and minimal status to public listeners', async (): Promise<void> => {
  const calls: EmitCall[] = [];
  const notifier = new SocketIoPaymentRealtimeNotifier(createFakeKitchenGateway(calls));
  const notification = createNotification();

  await notifier.newOrderPaid(notification);

  assert.deepEqual(calls, [
    {
      room: 'admin',
      event: WS_EVENTS.NEW_ORDER,
      payload: notification,
    },
    {
      room: null,
      event: WS_EVENTS.NEW_ORDER,
      payload: {
        id: 'order-1',
        status: OrderStatus.PAID,
      },
    },
  ]);
});

function createFakeKitchenGateway(calls: EmitCall[]): KitchenGateway {
  return {
    server: {
      to(room: string): { readonly emit: (event: string, payload: unknown) => void } {
        return {
          emit(event: string, payload: unknown): void {
            calls.push({ room, event, payload });
          },
        };
      },
      emit(event: string, payload: unknown): void {
        calls.push({ room: null, event, payload });
      },
    },
  } as unknown as KitchenGateway;
}

function createNotification(): PaymentNewOrderNotification {
  return {
    id: 'order-1',
    orderNumber: 42,
    customerName: 'Cliente Teste',
    status: OrderStatus.PAID,
    totalAmount: 29.9,
    items: [
      {
        productName: 'Quentinha P',
        quantity: 1,
        subtotal: 29.9,
        extras: [{ name: 'Extra', price: 2 }],
      },
    ],
    createdAt: '2026-05-08T15:00:00.000Z',
  };
}
