import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus } from '@cardapio/shared';
import type { Clock } from '../../../src/shared/application/clock/clock.port';
import type {
  AdminDashboardReadRepository,
  GetAdminDashboardReadQuery,
} from '../../../src/modules/admin/application/ports/admin-dashboard.read-repository.port';
import type { AdminDashboardReadModel } from '../../../src/modules/admin/application/read-models/admin-dashboard.read-model';
import { GetAdminDashboardUseCase } from '../../../src/modules/admin/application/use-cases/get-admin-dashboard.use-case';

test('gets admin dashboard for local today and the last seven days', async (): Promise<void> => {
  const dashboard = createDashboardReadModel();
  const repository = new FakeAdminDashboardReadRepository(dashboard);
  const clock = new FakeClock(new Date('2026-05-07T14:15:00.000Z'));
  const useCase = new GetAdminDashboardUseCase(repository, clock);

  const result = await useCase.execute();

  assert.equal(result, dashboard);
  assert.equal(clock.nowCalls, 1);
  assert.equal(repository.getCalls.length, 1);
  assert.deepEqual(repository.getCalls[0]?.paidStatuses, [
    OrderStatus.PAID,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
  ]);
  assert.deepEqual(repository.getCalls[0]?.periodStart, new Date('2026-05-01T03:00:00.000Z'));
  assert.deepEqual(repository.getCalls[0]?.periodEndExclusive, new Date('2026-05-08T03:00:00.000Z'));
  assert.equal(repository.getCalls[0]?.days.length, 7);
  assert.deepEqual(repository.getCalls[0]?.days[0], {
    date: '2026-05-01',
    start: new Date('2026-05-01T03:00:00.000Z'),
    end: new Date('2026-05-02T03:00:00.000Z'),
  });
  assert.deepEqual(repository.getCalls[0]?.days[6], {
    date: '2026-05-07',
    start: new Date('2026-05-07T03:00:00.000Z'),
    end: new Date('2026-05-08T03:00:00.000Z'),
  });
});

function createDashboardReadModel(): AdminDashboardReadModel {
  return {
    todayOrdersCount: 0,
    todayPaidCount: 0,
    todayRevenue: 0,
    avgTicket: 0,
    ordersByStatus: {},
    revenueByHour: [],
    topProducts: [],
    byPayment: {},
    weeklyRevenue: [],
  };
}

class FakeClock implements Clock {
  public nowCalls = 0;

  public constructor(private readonly current: Date) {}

  public now(): Date {
    this.nowCalls += 1;

    return this.current;
  }
}

class FakeAdminDashboardReadRepository implements AdminDashboardReadRepository {
  public readonly getCalls: GetAdminDashboardReadQuery[] = [];

  public constructor(private readonly dashboard: AdminDashboardReadModel) {}

  public async get(query: GetAdminDashboardReadQuery): Promise<AdminDashboardReadModel> {
    this.getCalls.push(query);

    return this.dashboard;
  }
}
