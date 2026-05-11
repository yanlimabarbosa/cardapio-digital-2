import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminCouponNotFoundError } from '../errors/admin-coupon.errors';
import type { AdminCouponWriteRepository } from '../ports/admin-coupon-write.repository.port';
import type { AdminCouponReadModel } from '../read-models/admin-coupon.read-model';

export class ToggleAdminCouponActiveUseCase {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly coupons: AdminCouponWriteRepository,
  ) {}

  public async execute(id: string): Promise<AdminCouponReadModel> {
    return this.unitOfWork.run(async (context) => {
      const result = await this.coupons.toggleActive(id, context);

      if (result.status === 'not-found') {
        throw new AdminCouponNotFoundError();
      }

      return result.coupon;
    });
  }
}
