import type { OrderStatus } from '@cardapio/shared';
import type { AdminOrderHistoryPageReadModel } from '../read-models/admin-order-history.read-model';
import type { AdminOrderReadModel } from '../read-models/admin-order.read-model';

export const ADMIN_ORDER_READ_REPOSITORY = Symbol('ADMIN_ORDER_READ_REPOSITORY');

export type ListAdminOrderHistoryReadQuery = {
  readonly from?: string;
  readonly limit: number;
  readonly page: number;
  readonly search?: string;
  readonly status?: string;
  readonly to?: string;
};

export type ListAdminOrdersReadQuery =
  | {
      readonly activeStatuses: readonly OrderStatus[];
      readonly createdAtFrom: Date;
      readonly limit: number;
      readonly mode: 'active';
    }
  | {
      readonly limit: number;
      readonly mode: 'status';
      readonly status: string;
    };

export interface AdminOrderReadRepository {
  list(query: ListAdminOrdersReadQuery): Promise<readonly AdminOrderReadModel[]>;
  listHistory(query: ListAdminOrderHistoryReadQuery): Promise<AdminOrderHistoryPageReadModel>;
}
