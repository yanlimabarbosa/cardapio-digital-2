import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { CouponCreationDraft } from '../../domain/coupon-creation-draft.value-object';
import { AdminCouponDuplicateCodeError } from '../errors/admin-coupon.errors';
import type { AdminCouponWriteRepository } from '../ports/admin-coupon-write.repository.port';
import type { AdminCouponReadModel } from '../read-models/admin-coupon.read-model';

export interface CreateAdminCouponCommand {
  readonly applicableCategoryIds?: readonly string[];
  readonly applicableProductIds?: readonly string[];
  readonly applicableSectionIds?: readonly string[];
  readonly code: string;
  readonly deliveryTypeRestriction?: string;
  readonly discountType: string;
  readonly discountValue: number;
  readonly excludePromotional?: boolean;
  readonly firstOrderOnly?: boolean;
  readonly isActive?: boolean;
  readonly maxDiscount?: number;
  readonly maxUses?: number;
  readonly maxUsesPerCustomer?: number;
  readonly minOrderAmount?: number;
  readonly minQuantity?: number;
  readonly validDays?: readonly number[];
  readonly validFrom?: string;
  readonly validTimeFrom?: string;
  readonly validTimeTo?: string;
  readonly validUntil?: string;
}

export class CreateAdminCouponUseCase {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly coupons: AdminCouponWriteRepository,
  ) {}

  public async execute(command: CreateAdminCouponCommand): Promise<AdminCouponReadModel> {
    const draft = CouponCreationDraft.create(command);

    return this.unitOfWork.run(async (context) => {
      const result = await this.coupons.create(draft.toData(), context);

      if (result.status === 'duplicate-code') {
        throw new AdminCouponDuplicateCodeError();
      }

      return result.coupon;
    });
  }
}
