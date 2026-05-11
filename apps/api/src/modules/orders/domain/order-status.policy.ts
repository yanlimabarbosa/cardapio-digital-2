import { OrderStatus } from '@cardapio/shared';

const ORDER_STATUS_TRANSITIONS = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

export class OrderStatusTransitionPolicy {
  private constructor(private readonly currentStatus: OrderStatus) {}

  public static for(currentStatus: OrderStatus): OrderStatusTransitionPolicy {
    return new OrderStatusTransitionPolicy(currentStatus);
  }

  public allowedTransitions(): OrderStatus[] {
    return [...this.transitionsForCurrentStatus()];
  }

  public canTransitionTo(nextStatus: OrderStatus): boolean {
    return this.transitionsForCurrentStatus().includes(nextStatus);
  }

  public rejectionMessage(nextStatus: OrderStatus): string {
    return `Cannot transition from ${this.currentStatus} to ${nextStatus}`;
  }

  private transitionsForCurrentStatus(): readonly OrderStatus[] {
    return ORDER_STATUS_TRANSITIONS[this.currentStatus] as readonly OrderStatus[];
  }
}
