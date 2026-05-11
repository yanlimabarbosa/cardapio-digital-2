import { EntityManager } from '@mikro-orm/postgresql';
import { Coupon } from '../../../../entities';
import type { AdminCouponReadRepository } from '../../application/ports/admin-coupon.read-repository.port';
import type { AdminCouponReadModel } from '../../application/read-models/admin-coupon.read-model';
import { toAdminCouponReadModel } from './admin-coupon-read-model.mapper';

export class MikroOrmAdminCouponReadRepository implements AdminCouponReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async listAll(): Promise<AdminCouponReadModel[]> {
    const em = this.em.fork();
    const coupons = await em.find(Coupon, {}, { orderBy: { createdAt: 'DESC' } });

    return coupons.map((coupon) => toAdminCouponReadModel(coupon));
  }
}
