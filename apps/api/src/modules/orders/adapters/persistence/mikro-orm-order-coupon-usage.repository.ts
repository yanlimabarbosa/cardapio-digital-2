import { EntityManager } from '@mikro-orm/postgresql';
import { Coupon, CouponUsage, Customer, Order } from '../../../../entities';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  OrderCouponUsageRepository,
  RecordOrderCouponUsageCommand,
} from '../../application/ports/order-coupon-usage.port';

export class MikroOrmOrderCouponUsageRepository implements OrderCouponUsageRepository {
  public constructor(private readonly em: EntityManager) {}

  public async recordUsage(command: RecordOrderCouponUsageCommand): Promise<void> {
    const em = command.context ? getMikroOrmEntityManager(command.context) : this.em.fork();

    await em.getConnection().execute(
      `UPDATE "coupons" SET "current_uses" = "current_uses" + 1 WHERE "id" = ?`,
      [command.couponId],
    );

    em.create(CouponUsage, {
      coupon: em.getReference(Coupon, command.couponId),
      customer: em.getReference(Customer, command.customerId),
      order: em.getReference(Order, command.orderId),
    });

    await em.flush();
  }
}
