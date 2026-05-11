import { EntityManager } from '@mikro-orm/postgresql';
import type { OrderStatus } from '@cardapio/shared';
import { Order, OrderItem } from '../../../../entities';
import type {
  AdminDashboardReadRepository,
  GetAdminDashboardReadQuery,
} from '../../application/ports/admin-dashboard.read-repository.port';
import type {
  AdminDashboardReadModel,
  AdminDashboardRevenueByHourReadModel,
  AdminDashboardTopProductReadModel,
  AdminDashboardWeeklyRevenueReadModel,
} from '../../application/read-models/admin-dashboard.read-model';

type ProductCount = {
  name: string;
  qty: number;
  revenue: number;
};

export class MikroOrmAdminDashboardReadRepository implements AdminDashboardReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async get(query: GetAdminDashboardReadQuery): Promise<AdminDashboardReadModel> {
    const periodOrders = await this.em.find(
      Order,
      {
        createdAt: { $gte: query.periodStart, $lt: query.periodEndExclusive },
      },
      { populate: ['items'] },
    );
    const paidOrders = periodOrders.filter((order: Order): boolean =>
      this.isPaidOrder(order, query.paidStatuses),
    );
    const todayRevenue = this.toCurrency(this.sumOrderTotalCents(paidOrders));
    const todayPaidCount = paidOrders.length;

    return {
      todayOrdersCount: periodOrders.length,
      todayPaidCount,
      todayRevenue,
      avgTicket: todayPaidCount > 0 ? todayRevenue / todayPaidCount : 0,
      ordersByStatus: this.toOrdersByStatus(periodOrders),
      revenueByHour: this.toRevenueByHour(paidOrders),
      topProducts: this.toTopProducts(paidOrders),
      byPayment: this.toOrdersByPayment(paidOrders),
      weeklyRevenue: await this.toWeeklyRevenue(query),
    };
  }

  private isPaidOrder(order: Order, paidStatuses: readonly OrderStatus[]): boolean {
    return order.status !== undefined && paidStatuses.includes(order.status);
  }

  private toOrdersByStatus(orders: readonly Order[]): Readonly<Record<string, number>> {
    const byStatus: Record<string, number> = {};

    for (const order of orders) {
      const status = String(order.status);
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    }

    return byStatus;
  }

  private toRevenueByHour(
    orders: readonly Order[],
  ): readonly AdminDashboardRevenueByHourReadModel[] {
    const revenueByHour: AdminDashboardRevenueByHourReadModel[] = [];

    for (let hour = 0; hour < 24; hour += 1) {
      const hourOrders = orders.filter(
        (order: Order): boolean => order.createdAt?.getHours() === hour,
      );

      if (hourOrders.length > 0 || (hour >= 6 && hour <= 23)) {
        revenueByHour.push({
          hour,
          revenue: this.toCurrency(this.sumOrderTotalCents(hourOrders)),
          orders: hourOrders.length,
        });
      }
    }

    return revenueByHour;
  }

  private toTopProducts(orders: readonly Order[]): readonly AdminDashboardTopProductReadModel[] {
    const productCounts: Record<string, ProductCount> = {};

    for (const order of orders) {
      for (const item of order.items.getItems()) {
        this.addProductCount(productCounts, item);
      }
    }

    return Object.values(productCounts)
      .sort((left: ProductCount, right: ProductCount): number => right.qty - left.qty)
      .slice(0, 8);
  }

  private addProductCount(counts: Record<string, ProductCount>, item: OrderItem): void {
    let count = counts[item.productName];

    if (!count) {
      count = { name: item.productName, qty: 0, revenue: 0 };
      counts[item.productName] = count;
    }

    count.qty += item.quantity;
    count.revenue += this.toCurrency(this.toCents(item.subtotal));
  }

  private toOrdersByPayment(orders: readonly Order[]): Readonly<Record<string, number>> {
    const byPayment: Record<string, number> = {};

    for (const order of orders) {
      const paymentMethod = String(order.paymentMethod);
      byPayment[paymentMethod] = (byPayment[paymentMethod] ?? 0) + 1;
    }

    return byPayment;
  }

  private async toWeeklyRevenue(
    query: GetAdminDashboardReadQuery,
  ): Promise<readonly AdminDashboardWeeklyRevenueReadModel[]> {
    const weeklyRevenue: AdminDashboardWeeklyRevenueReadModel[] = [];

    for (const day of query.days) {
      const dayOrders = await this.em.find(Order, {
        createdAt: { $gte: day.start, $lt: day.end },
        status: { $in: query.paidStatuses },
      });

      weeklyRevenue.push({
        date: day.date,
        revenue: this.toCurrency(this.sumOrderTotalCents(dayOrders)),
        orders: dayOrders.length,
      });
    }

    return weeklyRevenue;
  }

  private sumOrderTotalCents(orders: readonly Order[]): number {
    return orders.reduce(
      (sum: number, order: Order): number => sum + this.toCents(order.totalAmount),
      0,
    );
  }

  private toCents(amount: string): number {
    return Math.round(Number.parseFloat(amount) * 100);
  }

  private toCurrency(cents: number): number {
    return cents / 100;
  }
}
