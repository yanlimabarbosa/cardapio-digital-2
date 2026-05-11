import type { PaymentNewOrderNotification } from './payment-order.port';

export const PAYMENT_REALTIME_NOTIFIER = Symbol('PAYMENT_REALTIME_NOTIFIER');

export interface PaymentRealtimeNotifier {
  newOrderPaid(notification: PaymentNewOrderNotification): Promise<void>;
}
