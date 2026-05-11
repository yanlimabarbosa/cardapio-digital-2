import type { AdminCouponReadRepository } from '../ports/admin-coupon.read-repository.port';
import type { AdminCouponReadModel } from '../read-models/admin-coupon.read-model';

export class ListAdminCouponsUseCase {
  public constructor(private readonly coupons: AdminCouponReadRepository) {}

  public async execute(): Promise<AdminCouponReadModel[]> {
    return this.coupons.listAll();
  }
}
