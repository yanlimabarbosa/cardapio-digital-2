import { OrderStatus } from '@cardapio/shared';
import type { Clock } from '../../../../shared/application/clock/clock.port';
import type { AdminOrderReadRepository } from '../ports/admin-order.read-repository.port';
import type { AdminOrderReadModel } from '../read-models/admin-order.read-model';

export type ListAdminOrdersCommand = {
  readonly status?: string;
};

const ACTIVE_ADMIN_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
];

const ADMIN_ORDER_LIST_LIMIT = 200;

export class ListAdminOrdersUseCase {
  public constructor(
    private readonly orders: AdminOrderReadRepository,
    private readonly clock: Clock,
  ) {}

  public async execute(command: ListAdminOrdersCommand = {}): Promise<readonly AdminOrderReadModel[]> {
    if (command.status) {
      return this.orders.list({
        mode: 'status',
        status: command.status,
        limit: ADMIN_ORDER_LIST_LIMIT,
      });
    }

    return this.orders.list({
      mode: 'active',
      activeStatuses: ACTIVE_ADMIN_ORDER_STATUSES,
      createdAtFrom: this.startOfToday(this.clock.now()),
      limit: ADMIN_ORDER_LIST_LIMIT,
    });
  }

  private startOfToday(now: Date): Date {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    return today;
  }
}
