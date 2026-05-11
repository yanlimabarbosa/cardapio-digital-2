import type { Order } from '../../../../entities';
import type {
  OrderItemReadModel,
  OrderReadModel,
} from '../../application/read-models/order.read-model';

export function toOrderReadModel(order: Order): OrderReadModel {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    status: order.status,
    totalAmount: parseFloat(order.totalAmount),
    couponCode: order.couponCode ?? null,
    discountAmount: order.discountAmount ? parseFloat(order.discountAmount) : null,
    deliveryFee: order.deliveryFee ? parseFloat(order.deliveryFee) : null,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    deliveryType: order.deliveryType || 'pickup',
    deliveryAddress: order.deliveryAddress,
    notes: order.notes,
    scheduledFor: order.scheduledFor?.toISOString() ?? null,
    items: order.items.getItems().map((item): OrderItemReadModel => ({
      id: item.id,
      productName: item.productName,
      unitPrice: parseFloat(item.unitPrice),
      quantity: item.quantity,
      subtotal: parseFloat(item.subtotal),
      extras: item.extras,
      groupedExtras: item.groupedExtras ?? null,
    })),
    createdAt: requireDate(order.createdAt, 'order.createdAt').toISOString(),
    updatedAt: requireDate(order.updatedAt, 'order.updatedAt').toISOString(),
  };
}

function requireDate(value: Date | undefined, field: string): Date {
  if (!value) {
    throw new Error(`${field} is required`);
  }

  return value;
}
