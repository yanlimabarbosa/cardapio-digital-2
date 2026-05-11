import { Coupon } from '../../../../entities';
import type { AdminCouponReadModel } from '../../application/read-models/admin-coupon.read-model';

export function toAdminCouponReadModel(coupon: Coupon): AdminCouponReadModel {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: parseFloat(coupon.discountValue),
    maxDiscount: coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : null,
    minOrderAmount: parseFloat(coupon.minOrderAmount),
    minQuantity: coupon.minQuantity,
    validFrom: coupon.validFrom?.toISOString() ?? null,
    validUntil: coupon.validUntil?.toISOString() ?? null,
    validDays: coupon.validDays ? [...coupon.validDays] : null,
    validTimeFrom: coupon.validTimeFrom ?? null,
    validTimeTo: coupon.validTimeTo ?? null,
    maxUses: coupon.maxUses,
    maxUsesPerCustomer: coupon.maxUsesPerCustomer,
    currentUses: coupon.currentUses,
    firstOrderOnly: coupon.firstOrderOnly,
    excludePromotional: coupon.excludePromotional,
    deliveryTypeRestriction: coupon.deliveryTypeRestriction ?? null,
    applicableProductIds: coupon.applicableProductIds ? [...coupon.applicableProductIds] : null,
    applicableCategoryIds: coupon.applicableCategoryIds
      ? [...coupon.applicableCategoryIds]
      : null,
    applicableSectionIds: coupon.applicableSectionIds ? [...coupon.applicableSectionIds] : null,
    isActive: coupon.isActive,
    createdAt: requireDate(coupon.createdAt, 'Coupon.createdAt').toISOString(),
    updatedAt: requireDate(coupon.updatedAt, 'Coupon.updatedAt').toISOString(),
  };
}

function requireDate(value: Date | undefined, field: string): Date {
  if (!value) {
    throw new Error(`${field} is required after coupon persistence`);
  }

  return value;
}
