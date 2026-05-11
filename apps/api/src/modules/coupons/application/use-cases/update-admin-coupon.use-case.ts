import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { CouponUpdatePatch } from '../../domain/coupon-update-patch.value-object';
import {
  AdminCouponDuplicateCodeError,
  AdminCouponNotFoundError,
} from '../errors/admin-coupon.errors';
import type { AdminCouponWriteRepository } from '../ports/admin-coupon-write.repository.port';
import type { AdminCouponReadModel } from '../read-models/admin-coupon.read-model';

export interface UpdateAdminCouponCommand {
  readonly applicableCategoryIds?: readonly string[] | null;
  readonly applicableProductIds?: readonly string[] | null;
  readonly applicableSectionIds?: readonly string[] | null;
  readonly code?: string;
  readonly deliveryTypeRestriction?: string | null;
  readonly discountType?: string;
  readonly discountValue?: number;
  readonly excludePromotional?: boolean;
  readonly firstOrderOnly?: boolean;
  readonly isActive?: boolean;
  readonly maxDiscount?: number | null;
  readonly maxUses?: number;
  readonly maxUsesPerCustomer?: number;
  readonly minOrderAmount?: number;
  readonly minQuantity?: number;
  readonly validDays?: readonly number[] | null;
  readonly validFrom?: string | null;
  readonly validTimeFrom?: string | null;
  readonly validTimeTo?: string | null;
  readonly validUntil?: string | null;
}

export class UpdateAdminCouponUseCase {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly coupons: AdminCouponWriteRepository,
  ) {}

  public async execute(
    id: string,
    command: UpdateAdminCouponCommand,
  ): Promise<AdminCouponReadModel> {
    const patch = CouponUpdatePatch.create(command);

    return this.unitOfWork.run(async (context) => {
      const result = await this.coupons.update(id, patch, context);

      if (result.status === 'not-found') {
        throw new AdminCouponNotFoundError();
      }

      if (result.status === 'duplicate-code') {
        throw new AdminCouponDuplicateCodeError();
      }

      return result.coupon;
    });
  }
}
