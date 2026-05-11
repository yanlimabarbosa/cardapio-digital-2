export type AdminDashboardRevenueByHourReadModel = {
  readonly hour: number;
  readonly orders: number;
  readonly revenue: number;
};

export type AdminDashboardTopProductReadModel = {
  readonly name: string;
  readonly qty: number;
  readonly revenue: number;
};

export type AdminDashboardWeeklyRevenueReadModel = {
  readonly date: string;
  readonly orders: number;
  readonly revenue: number;
};

export type AdminDashboardReadModel = {
  readonly avgTicket: number;
  readonly byPayment: Readonly<Record<string, number>>;
  readonly ordersByStatus: Readonly<Record<string, number>>;
  readonly revenueByHour: readonly AdminDashboardRevenueByHourReadModel[];
  readonly todayOrdersCount: number;
  readonly todayPaidCount: number;
  readonly todayRevenue: number;
  readonly topProducts: readonly AdminDashboardTopProductReadModel[];
  readonly weeklyRevenue: readonly AdminDashboardWeeklyRevenueReadModel[];
};
