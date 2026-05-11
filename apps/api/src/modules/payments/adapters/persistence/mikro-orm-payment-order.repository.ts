import type { EntityManager } from '@mikro-orm/postgresql';
import { OrderStatus, PaymentStatus } from '@cardapio/shared';
import { Order } from '../../../../entities';
import type {
  ApplyPaymentGatewayStatusCommand,
  ApplyPaymentGatewayStatusResult,
  ApplyQueuedPaymentResultCommand,
  ApplyQueuedPaymentResultResult,
  FindPaymentOrderQuery,
  MarkPaymentPendingCommand,
  PaymentNewOrderNotification,
  PaymentOrder,
  PaymentOrderItem,
  PaymentOrderRepository,
} from '../../application/ports/payment-order.port';

export class MikroOrmPaymentOrderRepository implements PaymentOrderRepository {
  public constructor(private readonly em: EntityManager) {}

  public async findById(query: FindPaymentOrderQuery): Promise<PaymentOrder | null> {
    const order = await this.em.findOne(Order, { id: query.orderId }, { populate: ['items'] });

    return order ? this.toPaymentOrder(order) : null;
  }

  public async markPaymentPending(command: MarkPaymentPendingCommand): Promise<PaymentOrder> {
    const order = await this.requireOrder(command.orderId);

    order.paymentId = command.paymentId;
    order.paymentStatus = PaymentStatus.PENDING;
    await this.em.flush();

    return this.toPaymentOrder(order);
  }

  public async applyGatewayStatus(
    command: ApplyPaymentGatewayStatusCommand,
  ): Promise<ApplyPaymentGatewayStatusResult> {
    const order = await this.requireOrder(command.orderId);
    const shouldEmitNewOrder =
      command.status === 'approved' &&
      order.paymentStatus !== PaymentStatus.APPROVED &&
      order.status === OrderStatus.PENDING_PAYMENT;

    if (command.paymentId) {
      order.paymentId = command.paymentId;
    }

    if (command.status === 'approved') {
      order.paymentStatus = PaymentStatus.APPROVED;
      order.status = OrderStatus.PAID;
    } else if (command.status === 'rejected') {
      order.paymentStatus = PaymentStatus.REJECTED;
    } else if (command.status === 'refunded') {
      order.paymentStatus = PaymentStatus.REFUNDED;
    } else {
      order.paymentStatus = PaymentStatus.PENDING;
    }

    await this.em.flush();

    const paymentOrder = this.toPaymentOrder(order);

    return {
      order: paymentOrder,
      newOrderNotification: shouldEmitNewOrder ? this.toNewOrderNotification(paymentOrder) : null,
    };
  }

  public async applyQueuedPaymentResult(
    command: ApplyQueuedPaymentResultCommand,
  ): Promise<ApplyQueuedPaymentResultResult> {
    const order = await this.requireOrderForPayment(command);

    if (order.paymentStatus === PaymentStatus.APPROVED && command.status === 'approved') {
      return {
        order: this.toPaymentOrder(order),
        skipped: true,
      };
    }

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      return {
        order: this.toPaymentOrder(order),
        reason: `Order already in terminal state: ${order.status}`,
        skipped: true,
      };
    }

    if (command.status === 'approved') {
      order.paymentStatus = PaymentStatus.APPROVED;
      order.status = OrderStatus.PAID;
    } else if (command.status === 'rejected') {
      order.paymentStatus = PaymentStatus.REJECTED;
    } else if (command.status === 'refunded') {
      order.paymentStatus = PaymentStatus.REFUNDED;
    } else {
      order.paymentStatus = PaymentStatus.PENDING;
    }

    await this.em.flush();

    const paymentOrder = this.toPaymentOrder(order);

    return {
      order: paymentOrder,
      status: command.status,
      processed: true,
      newOrderNotification: command.status === 'approved' ? this.toNewOrderNotification(paymentOrder) : null,
    };
  }

  private async requireOrder(orderId: string): Promise<Order> {
    const order = await this.em.findOne(Order, { id: orderId }, { populate: ['items'] });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return order;
  }

  private async requireOrderForPayment(command: ApplyQueuedPaymentResultCommand): Promise<Order> {
    const orderByPaymentId = await this.em.findOne(Order, { paymentId: command.paymentId }, { populate: ['items'] });
    if (orderByPaymentId) {
      return orderByPaymentId;
    }

    if (command.referenceId) {
      const orderByReferenceId = await this.em.findOne(
        Order,
        { id: command.referenceId },
        { populate: ['items'] },
      );
      if (orderByReferenceId) {
        return orderByReferenceId;
      }
    }

    throw new Error(`Order not found for payment ${command.paymentId}`);
  }

  private toPaymentOrder(order: Order): PaymentOrder {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      status: order.status,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentId: order.paymentId,
      paymentStatus: order.paymentStatus,
      deliveryAddress: order.deliveryAddress,
      items: order.items.getItems().map((item): PaymentOrderItem => ({
        productName: item.productName,
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
        extras: item.extras,
      })),
      createdAt: this.requireDate(order.createdAt, 'order.createdAt'),
      updatedAt: this.requireDate(order.updatedAt, 'order.updatedAt'),
    };
  }

  private toNewOrderNotification(order: PaymentOrder): PaymentNewOrderNotification {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: this.requireStatus(order.status, order.id),
      totalAmount: parseFloat(order.totalAmount),
      items: order.items,
      createdAt: order.createdAt.toISOString(),
    };
  }

  private requireDate(value: Date | undefined, field: string): Date {
    if (!value) {
      throw new Error(`${field} is required`);
    }

    return value;
  }

  private requireStatus(status: OrderStatus | undefined, orderId: string): OrderStatus {
    if (!status) {
      throw new Error(`Order ${orderId} status is required`);
    }

    return status;
  }
}
