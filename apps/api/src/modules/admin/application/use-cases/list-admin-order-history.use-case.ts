import type {
  AdminOrderReadRepository,
  ListAdminOrderHistoryReadQuery,
} from '../ports/admin-order.read-repository.port';
import type { AdminOrderHistoryPageReadModel } from '../read-models/admin-order-history.read-model';

export type ListAdminOrderHistoryCommand = {
  readonly from?: string;
  readonly limit?: number;
  readonly page?: number;
  readonly search?: string;
  readonly status?: string;
  readonly to?: string;
};

const DEFAULT_ADMIN_ORDER_HISTORY_PAGE = 1;
const DEFAULT_ADMIN_ORDER_HISTORY_LIMIT = 20;
const MAX_ADMIN_ORDER_HISTORY_LIMIT = 100;

export class ListAdminOrderHistoryUseCase {
  public constructor(private readonly orders: AdminOrderReadRepository) {}

  public async execute(
    command: ListAdminOrderHistoryCommand = {},
  ): Promise<AdminOrderHistoryPageReadModel> {
    return this.orders.listHistory(this.toReadQuery(command));
  }

  private toReadQuery(command: ListAdminOrderHistoryCommand): ListAdminOrderHistoryReadQuery {
    return {
      from: command.from,
      limit: Math.min(
        command.limit || DEFAULT_ADMIN_ORDER_HISTORY_LIMIT,
        MAX_ADMIN_ORDER_HISTORY_LIMIT,
      ),
      page: command.page || DEFAULT_ADMIN_ORDER_HISTORY_PAGE,
      search: command.search,
      status: command.status,
      to: command.to,
    };
  }
}
