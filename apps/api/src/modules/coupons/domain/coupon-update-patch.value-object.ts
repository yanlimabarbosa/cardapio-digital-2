export interface CouponUpdatePatchInput {
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

export interface CouponUpdateData {
  readonly applicableCategoryIds?: readonly string[];
  readonly applicableProductIds?: readonly string[];
  readonly applicableSectionIds?: readonly string[];
  readonly code?: string;
  readonly deliveryTypeRestriction?: string;
  readonly discountType?: string;
  readonly discountValue?: string;
  readonly excludePromotional?: boolean;
  readonly firstOrderOnly?: boolean;
  readonly isActive?: boolean;
  readonly maxDiscount?: string;
  readonly maxUses?: number;
  readonly maxUsesPerCustomer?: number;
  readonly minOrderAmount?: string;
  readonly minQuantity?: number;
  readonly validDays?: readonly number[];
  readonly validFrom?: Date;
  readonly validTimeFrom?: string;
  readonly validTimeTo?: string;
  readonly validUntil?: Date;
}

export type CouponUpdateField = keyof CouponUpdateData;

type MutableCouponUpdateData = {
  -readonly [Field in keyof CouponUpdateData]?: CouponUpdateData[Field];
};

export class CouponUpdatePatch {
  private constructor(
    private readonly data: CouponUpdateData,
    private readonly fields: readonly CouponUpdateField[],
  ) {}

  public static create(input: CouponUpdatePatchInput): CouponUpdatePatch {
    const data: MutableCouponUpdateData = {};
    const fields: CouponUpdateField[] = [];

    if (input.code !== undefined) {
      data.code = input.code.toUpperCase();
      fields.push('code');
    }

    if (input.discountType !== undefined) {
      data.discountType = input.discountType;
      fields.push('discountType');
    }

    if (input.discountValue !== undefined) {
      data.discountValue = CouponUpdatePatch.toMoneyString(input.discountValue);
      fields.push('discountValue');
    }

    if (input.maxDiscount !== undefined) {
      data.maxDiscount =
        input.maxDiscount != null ? CouponUpdatePatch.toMoneyString(input.maxDiscount) : undefined;
      fields.push('maxDiscount');
    }

    if (input.minOrderAmount !== undefined) {
      data.minOrderAmount = CouponUpdatePatch.toMoneyString(input.minOrderAmount);
      fields.push('minOrderAmount');
    }

    if (input.minQuantity !== undefined) {
      data.minQuantity = input.minQuantity;
      fields.push('minQuantity');
    }

    if (input.validFrom !== undefined) {
      data.validFrom = input.validFrom ? new Date(input.validFrom) : undefined;
      fields.push('validFrom');
    }

    if (input.validUntil !== undefined) {
      data.validUntil = input.validUntil ? new Date(input.validUntil) : undefined;
      fields.push('validUntil');
    }

    if (input.validDays !== undefined) {
      data.validDays = input.validDays ? [...input.validDays] : undefined;
      fields.push('validDays');
    }

    if (input.validTimeFrom !== undefined) {
      data.validTimeFrom = input.validTimeFrom ?? undefined;
      fields.push('validTimeFrom');
    }

    if (input.validTimeTo !== undefined) {
      data.validTimeTo = input.validTimeTo ?? undefined;
      fields.push('validTimeTo');
    }

    if (input.maxUses !== undefined) {
      data.maxUses = input.maxUses;
      fields.push('maxUses');
    }

    if (input.maxUsesPerCustomer !== undefined) {
      data.maxUsesPerCustomer = input.maxUsesPerCustomer;
      fields.push('maxUsesPerCustomer');
    }

    if (input.firstOrderOnly !== undefined) {
      data.firstOrderOnly = input.firstOrderOnly;
      fields.push('firstOrderOnly');
    }

    if (input.excludePromotional !== undefined) {
      data.excludePromotional = input.excludePromotional;
      fields.push('excludePromotional');
    }

    if (input.deliveryTypeRestriction !== undefined) {
      data.deliveryTypeRestriction = input.deliveryTypeRestriction ?? undefined;
      fields.push('deliveryTypeRestriction');
    }

    if (input.applicableProductIds !== undefined) {
      data.applicableProductIds = input.applicableProductIds
        ? [...input.applicableProductIds]
        : undefined;
      fields.push('applicableProductIds');
    }

    if (input.applicableCategoryIds !== undefined) {
      data.applicableCategoryIds = input.applicableCategoryIds
        ? [...input.applicableCategoryIds]
        : undefined;
      fields.push('applicableCategoryIds');
    }

    if (input.applicableSectionIds !== undefined) {
      data.applicableSectionIds = input.applicableSectionIds
        ? [...input.applicableSectionIds]
        : undefined;
      fields.push('applicableSectionIds');
    }

    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
      fields.push('isActive');
    }

    return new CouponUpdatePatch(data, fields);
  }

  public changedFields(): readonly CouponUpdateField[] {
    return [...this.fields];
  }

  public has(field: CouponUpdateField): boolean {
    return this.fields.includes(field);
  }

  public toData(): CouponUpdateData {
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
