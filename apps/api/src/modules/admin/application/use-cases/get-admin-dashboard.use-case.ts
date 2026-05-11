import { OrderStatus } from '@cardapio/shared';
import type { Clock } from '../../../../shared/application/clock/clock.port';
import type {
  AdminDashboardReadRepository,
  AdminDashboardWeekDayReadQuery,
} from '../ports/admin-dashboard.read-repository.port';
import type { AdminDashboardReadModel } from '../read-models/admin-dashboard.read-model';

const ADMIN_DASHBOARD_PAID_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

const ADMIN_DASHBOARD_DEFAULT_DAYS = 7;

export type GetAdminDashboardCommand = {
  readonly from?: Date;
  readonly to?: Date;
};

export class GetAdminDashboardUseCase {
  public constructor(
    private readonly dashboard: AdminDashboardReadRepository,
    private readonly clock: Clock,
  ) {}

  public async execute(command: GetAdminDashboardCommand = {}): Promise<AdminDashboardReadModel> {
    const { periodStart, periodEndExclusive } = this.resolvePeriod(command);

    return this.dashboard.get({
      paidStatuses: ADMIN_DASHBOARD_PAID_STATUSES,
      periodStart,
      periodEndExclusive,
      days: this.toDays(periodStart, periodEndExclusive),
    });
  }

  private resolvePeriod(command: GetAdminDashboardCommand): { periodStart: Date; periodEndExclusive: Date } {
    const now = this.clock.now();

    const defaultEndExclusive = this.startOfDay(this.addDays(now, 1));
    const defaultStart = this.startOfDay(this.addDays(now, -(ADMIN_DASHBOARD_DEFAULT_DAYS - 1)));

    const periodStart = this.startOfDay(command.from ?? defaultStart);
    const periodEndExclusive = this.startOfDay(command.to ? this.addDays(command.to, 1) : defaultEndExclusive);

    if (periodEndExclusive <= periodStart) {
      return {
        periodStart,
        periodEndExclusive: this.addDays(periodStart, 1),
      };
    }

    return { periodStart, periodEndExclusive };
  }

  private toDays(periodStart: Date, periodEndExclusive: Date): readonly AdminDashboardWeekDayReadQuery[] {
    const days: AdminDashboardWeekDayReadQuery[] = [];

    for (let current = new Date(periodStart); current < periodEndExclusive; current = this.addDays(current, 1)) {
      const start = this.startOfDay(current);
      const end = this.addDays(start, 1);

      days.push({
        date: start.toISOString().split('T')[0],
        start,
        end,
      });
    }

    return days;
  }

  private startOfDay(now: Date): Date {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);

    return day;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
}
