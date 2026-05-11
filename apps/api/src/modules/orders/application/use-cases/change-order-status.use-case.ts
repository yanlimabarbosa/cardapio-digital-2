import { OrderStatus } from '@cardapio/shared';
import { LoyaltyPointsPolicy } from '../../../../shared/domain/loyalty-points.policy';
import { OrderStatusTransitionPolicy } from '../../domain/order-status.policy';
import type { OrderRealtimeNotifier } from '../ports/order-realtime-notifier.port';
import type {
  OrderStatusChangeTarget,
  OrderStatusRepository,
} from '../ports/order-status-repository.port';
import type { OrderReadModel } from '../read-models/order.read-model';
import type {
  TransactionContext,
  UnitOfWork,
} from '../../../../shared/application/unit-of-work/unit-of-work.port';

export type ChangeOrderStatusCommand = {
  readonly id: string;
  readonly status: OrderStatus;
};

export type ChangeOrderStatusResult = OrderReadModel;

export class OrderNotFoundError extends Error {
  public override readonly name = 'OrderNotFoundError';

  public constructor(message: string) {
    super(message);
  }
}

export class InvalidOrderStatusTransitionError extends Error {
  public override readonly name = 'InvalidOrderStatusTransitionError';

  public constructor(message: string) {
    super(message);
  }
}

export class ChangeOrderStatusUseCase {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly orders: OrderStatusRepository,
    private readonly realtimeNotifier: OrderRealtimeNotifier,
  ) {}

  public async execute(command: ChangeOrderStatusCommand): Promise<ChangeOrderStatusResult> {
    const result = await this.unitOfWork.run(async (context) => {
      const target = await this.orders.findForStatusChange({ id: command.id, context });

      if (!target) {
        throw new OrderNotFoundError(`Order ${command.id} not found`);
      }

      this.assertStatusTransitionAllowed(target, command.status);
      await this.orders.saveStatus({ id: target.id, status: command.status, context });
      await this.creditDeliveredOrderLoyaltyIfNeeded(target, command.status, context);

      return this.orders.getStatusChangeResult({ id: target.id, context });
    });

    await this.realtimeNotifier.orderStatusChanged(result.notification);

    return result.order;
  }

  private assertStatusTransitionAllowed(target: OrderStatusChangeTarget, newStatus: OrderStatus): void {
    const currentStatus = target.status;

    if (!currentStatus) {
      throw new InvalidOrderStatusTransitionError(`Cannot transition from ${target.status} to ${newStatus}`);
    }

    const transitionPolicy = OrderStatusTransitionPolicy.for(currentStatus);

    if (!transitionPolicy.canTransitionTo(newStatus)) {
      throw new InvalidOrderStatusTransitionError(transitionPolicy.rejectionMessage(newStatus));
    }
  }

  private async creditDeliveredOrderLoyaltyIfNeeded(
    target: OrderStatusChangeTarget,
    newStatus: OrderStatus,
    context: TransactionContext,
  ): Promise<void> {
    const customer = target.customer;

    if (newStatus !== OrderStatus.DELIVERED || !customer?.isRegistered) {
      return;
    }

    const pointsPerReal = await this.orders.getLoyaltyPointsPerReal({ context });
    const pointsEarned = LoyaltyPointsPolicy.forBalance(customer.loyaltyPoints).pointsEarnedForOrder({
      totalCents: target.totalCents,
      deliveryFeeCents: target.deliveryFeeCents,
      pointsPerReal,
    });

    if (pointsEarned <= 0) {
      return;
    }

    await this.orders.creditDeliveredOrderLoyalty({
      context,
      orderId: target.id,
      orderNumber: target.orderNumber,
      customerId: customer.id,
      customerPhone: customer.phone,
      pointsEarned,
    });
  }
}
