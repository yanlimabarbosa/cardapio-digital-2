import type { AdminCouponReadModel } from '../read-models/admin-coupon.read-model';

export const ADMIN_COUPON_READ_REPOSITORY = Symbol('ADMIN_COUPON_READ_REPOSITORY');

export interface AdminCouponReadRepository {
  listAll(): Promise<AdminCouponReadModel[]>;
}
