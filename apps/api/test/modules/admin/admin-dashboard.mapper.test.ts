import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminDashboardReadModel } from '../../../src/modules/admin/application/read-models/admin-dashboard.read-model';
import { toAdminDashboardResponseDto } from '../../../src/modules/admin/admin-dashboard.mapper';
import {
  AdminDashboardResponseDto,
  AdminDashboardRevenueByHourResponseDto,
  AdminDashboardTopProductResponseDto,
  AdminDashboardWeeklyRevenueResponseDto,
} from '../../../src/modules/admin/dto/response/admin-dashboard-response.dto';

test('maps admin dashboard read models to response DTOs', (): void => {
  const readModel: AdminDashboardReadModel = {
    todayOrdersCount: 3,
    todayPaidCount: 2,
    todayRevenue: 40,
    avgTicket: 20,
    ordersByStatus: { paid: 1, pending_payment: 1, delivered: 1 },
    revenueByHour: [{ hour: 7, revenue: 40, orders: 2 }],
    topProducts: [{ name: 'Quentinha', qty: 3, revenue: 45.5 }],
    byPayment: { pix: 2 },
    weeklyRevenue: [{ date: '2026-05-07', revenue: 40, orders: 2 }],
  };

  const result = toAdminDashboardResponseDto(readModel);

  assert.ok(result instanceof AdminDashboardResponseDto);
  assert.ok(result.revenueByHour[0] instanceof AdminDashboardRevenueByHourResponseDto);
  assert.ok(result.topProducts[0] instanceof AdminDashboardTopProductResponseDto);
  assert.ok(result.weeklyRevenue[0] instanceof AdminDashboardWeeklyRevenueResponseDto);
  assert.equal(result.todayOrdersCount, 3);
  assert.equal(result.todayPaidCount, 2);
  assert.equal(result.todayRevenue, 40);
  assert.equal(result.avgTicket, 20);
  assert.deepEqual(result.ordersByStatus, { paid: 1, pending_payment: 1, delivered: 1 });
  assert.deepEqual(result.byPayment, { pix: 2 });
  assert.equal(result.revenueByHour[0]?.hour, 7);
  assert.equal(result.revenueByHour[0]?.revenue, 40);
  assert.equal(result.revenueByHour[0]?.orders, 2);
  assert.equal(result.topProducts[0]?.name, 'Quentinha');
  assert.equal(result.topProducts[0]?.qty, 3);
  assert.equal(result.topProducts[0]?.revenue, 45.5);
  assert.equal(result.weeklyRevenue[0]?.date, '2026-05-07');
  assert.equal(result.weeklyRevenue[0]?.revenue, 40);
  assert.equal(result.weeklyRevenue[0]?.orders, 2);
});
