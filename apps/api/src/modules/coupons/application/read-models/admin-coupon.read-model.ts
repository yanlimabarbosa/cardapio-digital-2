export interface AdminCouponReadModel {
  readonly applicableCategoryIds: readonly string[] | null;
  readonly applicableProductIds: readonly string[] | null;
  readonly applicableSectionIds: readonly string[] | null;
  readonly code: string;
  readonly createdAt: string;
  readonly currentUses: number;
  readonly deliveryTypeRestriction: string | null;
  readonly discountType: string;
  readonly discountValue: number;
  readonly excludePromotional: boolean;
  readonly firstOrderOnly: boolean;
  readonly id: string;
  readonly isActive: boolean;
  readonly maxDiscount: number | null;
  readonly maxUses: number;
  readonly maxUsesPerCustomer: number;
  readonly minOrderAmount: number;
  readonly minQuantity: number;
  readonly updatedAt: string;
  readonly validDays: readonly number[] | null;
  readonly validFrom: string | null;
  readonly validTimeFrom: string | null;
  readonly validTimeTo: string | null;
  readonly validUntil: string | null;
}
