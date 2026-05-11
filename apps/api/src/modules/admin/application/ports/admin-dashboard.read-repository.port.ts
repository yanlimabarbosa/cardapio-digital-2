import type { OrderStatus } from '@cardapio/shared';
import type { AdminDashboardReadModel } from '../read-models/admin-dashboard.read-model';

export const ADMIN_DASHBOARD_READ_REPOSITORY = Symbol('ADMIN_DASHBOARD_READ_REPOSITORY');

export type AdminDashboardWeekDayReadQuery = {
  readonly date: string;
  readonly end: Date;
  readonly start: Date;
};

export type GetAdminDashboardReadQuery = {
  readonly paidStatuses: readonly OrderStatus[];
  readonly periodEndExclusive: Date;
  readonly periodStart: Date;
  readonly days: readonly AdminDashboardWeekDayReadQuery[];
};

export interface AdminDashboardReadRepository {
  get(query: GetAdminDashboardReadQuery): Promise<AdminDashboardReadModel>;
}
