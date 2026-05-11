export interface CouponCreationDraftInput {
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

export interface CouponCreationData {
  readonly applicableCategoryIds?: readonly string[];
  readonly applicableProductIds?: readonly string[];
  readonly applicableSectionIds?: readonly string[];
  readonly code: string;
  readonly currentUses: number;
  readonly deliveryTypeRestriction?: string;
  readonly discountType: string;
  readonly discountValue: string;
  readonly excludePromotional: boolean;
  readonly firstOrderOnly: boolean;
  readonly isActive: boolean;
  readonly maxDiscount?: string;
  readonly maxUses: number;
  readonly maxUsesPerCustomer: number;
  readonly minOrderAmount: string;
  readonly minQuantity: number;
  readonly validDays?: readonly number[];
  readonly validFrom?: Date;
  readonly validTimeFrom?: string;
  readonly validTimeTo?: string;
  readonly validUntil?: Date;
}

export class CouponCreationDraft {
  private constructor(private readonly data: CouponCreationData) {}

  public static create(input: CouponCreationDraftInput): CouponCreationDraft {
    return new CouponCreationDraft({
      code: input.code.toUpperCase(),
      discountType: input.discountType,
      discountValue: CouponCreationDraft.toMoneyString(input.discountValue),
      maxDiscount:
        input.maxDiscount != null
          ? CouponCreationDraft.toMoneyString(input.maxDiscount)
          : undefined,
      minOrderAmount:
        input.minOrderAmount != null
          ? CouponCreationDraft.toMoneyString(input.minOrderAmount)
          : '0',
      minQuantity: input.minQuantity ?? 0,
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      validDays: input.validDays ? [...input.validDays] : undefined,
      validTimeFrom: input.validTimeFrom,
      validTimeTo: input.validTimeTo,
      maxUses: input.maxUses ?? 0,
      maxUsesPerCustomer: input.maxUsesPerCustomer ?? 0,
      currentUses: 0,
      firstOrderOnly: input.firstOrderOnly ?? false,
      excludePromotional: input.excludePromotional ?? false,
      deliveryTypeRestriction: input.deliveryTypeRestriction,
      applicableProductIds: input.applicableProductIds
        ? [...input.applicableProductIds]
        : undefined,
      applicableCategoryIds: input.applicableCategoryIds
        ? [...input.applicableCategoryIds]
        : undefined,
      applicableSectionIds: input.applicableSectionIds
        ? [...input.applicableSectionIds]
        : undefined,
      isActive: input.isActive ?? true,
    });
  }

  public toData(): CouponCreationData {
    return {
      ...this.data,
      applicableCategoryIds: this.data.applicableCategoryIds
        ? [...this.data.applicableCategoryIds]
        : undefined,
      applicableProductIds: this.data.applicableProductIds
        ? [...this.data.applicableProductIds]
        : undefined,
      applicableSectionIds: this.data.applicableSectionIds
        ? [...this.data.applicableSectionIds]
        : undefined,
      validDays: this.data.validDays ? [...this.data.validDays] : undefined,
    };
  }

  private static toMoneyString(value: number): string {
    return value.toFixed(2);
  }
}
