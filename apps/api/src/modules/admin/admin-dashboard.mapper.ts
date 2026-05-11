import type {
  AdminDashboardReadModel,
  AdminDashboardRevenueByHourReadModel,
  AdminDashboardTopProductReadModel,
  AdminDashboardWeeklyRevenueReadModel,
} from './application/read-models/admin-dashboard.read-model';
import {
  AdminDashboardResponseDto,
  AdminDashboardRevenueByHourResponseDto,
  AdminDashboardTopProductResponseDto,
  AdminDashboardWeeklyRevenueResponseDto,
} from './dto/response/admin-dashboard-response.dto';

export function toAdminDashboardResponseDto(
  dashboard: AdminDashboardReadModel,
): AdminDashboardResponseDto {
  return new AdminDashboardResponseDto(
    dashboard.todayOrdersCount,
    dashboard.todayPaidCount,
    dashboard.todayRevenue,
    dashboard.avgTicket,
    { ...dashboard.ordersByStatus },
    dashboard.revenueByHour.map(toAdminDashboardRevenueByHourResponseDto),
    dashboard.topProducts.map(toAdminDashboardTopProductResponseDto),
    { ...dashboard.byPayment },
    dashboard.weeklyRevenue.map(toAdminDashboardWeeklyRevenueResponseDto),
  );
}

function toAdminDashboardRevenueByHourResponseDto(
  item: AdminDashboardRevenueByHourReadModel,
): AdminDashboardRevenueByHourResponseDto {
  return new AdminDashboardRevenueByHourResponseDto(item.hour, item.revenue, item.orders);
}

function toAdminDashboardTopProductResponseDto(
  item: AdminDashboardTopProductReadModel,
): AdminDashboardTopProductResponseDto {
  return new AdminDashboardTopProductResponseDto(item.name, item.qty, item.revenue);
}

function toAdminDashboardWeeklyRevenueResponseDto(
  item: AdminDashboardWeeklyRevenueReadModel,
): AdminDashboardWeeklyRevenueResponseDto {
  return new AdminDashboardWeeklyRevenueResponseDto(item.date, item.revenue, item.orders);
}
