export const WS_EVENTS = {
  NEW_ORDER: 'new-order',
  ORDER_STATUS_CHANGED: 'order-status-changed',
} as const;

export interface NewOrderEvent {
  id: string;
  customerName: string;
  status: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
    subtotal: number;
    extras: Array<{ name: string; price: number }> | null;
  }>;
  createdAt: string;
}

export interface OrderStatusChangedEvent {
  id: string;
  status: string;
  updatedAt: string;
}
