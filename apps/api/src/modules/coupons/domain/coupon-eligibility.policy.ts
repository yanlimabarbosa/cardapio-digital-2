export interface CouponEligibilityCouponInput {
  readonly applicableCategoryIds?: readonly string[] | null;
  readonly applicableProductIds?: readonly string[] | null;
  readonly excludePromotional?: boolean | null;
}

export interface CouponEligibilityOptionSelectionInput {
  readonly groupId: string;
  readonly optionIds: readonly string[];
}

export interface CouponEligibilityItemInput {
  readonly extraIds?: readonly string[];
  readonly optionSelections?: readonly CouponEligibilityOptionSelectionInput[];
  readonly productId: string;
  readonly quantity: number;
}

export interface CouponEligibilityExtraInput {
  readonly id: string;
  readonly price: string;
}

export interface CouponEligibilityOptionGroupInput {
  readonly id: string;
  readonly options: readonly CouponEligibilityExtraInput[];
}

export interface CouponEligibilityProductInput {
  readonly categoryId: string;
  readonly extras: readonly CouponEligibilityExtraInput[];
  readonly id: string;
  readonly isPromotionActive: boolean;
  readonly optionGroups: readonly CouponEligibilityOptionGroupInput[];
  readonly price: string;
}

export interface CouponEligibilityResult {
  readonly eligibleAmountCents: number;
  readonly eligibleQuantity: number;
}

export class CouponEligibilityPolicy {
  private constructor(
    private readonly coupon: CouponEligibilityCouponInput,
    private readonly products: readonly CouponEligibilityProductInput[],
  ) {}

  public static create(
    coupon: CouponEligibilityCouponInput,
    products: readonly CouponEligibilityProductInput[],
  ): CouponEligibilityPolicy {
    return new CouponEligibilityPolicy(coupon, products);
  }

  public calculate(items: readonly CouponEligibilityItemInput[]): CouponEligibilityResult {
    let eligibleAmountCents = 0;
    let eligibleQuantity = 0;

    for (const item of items) {
      const product = this.products.find((candidate) => candidate.id === item.productId);

      if (!product || !this.isEligibleProduct(product)) {
        continue;
      }

      const unitPriceCents = this.toCents(product.price);
      const extraPriceCents = this.selectedExtrasCents(product, item);
      eligibleAmountCents += (unitPriceCents + extraPriceCents) * item.quantity;
      eligibleQuantity += item.quantity;
    }

    return {
      eligibleAmountCents,
      eligibleQuantity,
    };
  }

  private isEligibleProduct(product: CouponEligibilityProductInput): boolean {
    if (
      this.coupon.applicableProductIds &&
      this.coupon.applicableProductIds.length > 0 &&
      !this.coupon.applicableProductIds.includes(product.id)
    ) {
      return false;
    }

    if (
      this.coupon.applicableCategoryIds &&
      this.coupon.applicableCategoryIds.length > 0 &&
      !this.coupon.applicableCategoryIds.includes(product.categoryId)
    ) {
      return false;
    }

    if (this.coupon.excludePromotional && product.isPromotionActive) {
      return false;
    }

    return true;
  }

  private selectedExtrasCents(
    product: CouponEligibilityProductInput,
    item: CouponEligibilityItemInput,
  ): number {
    let extraPriceCents = 0;

    for (const extraId of item.extraIds ?? []) {
      const extra = product.extras.find((candidate) => candidate.id === extraId);

      if (extra) {
        extraPriceCents += this.toCents(extra.price);
      }
    }

    for (const selection of item.optionSelections ?? []) {
      const group = product.optionGroups.find((candidate) => candidate.id === selection.groupId);

      if (!group) {
        continue;
      }

      for (const optionId of selection.optionIds) {
        const option = group.options.find((candidate) => candidate.id === optionId);

        if (option) {
          extraPriceCents += this.toCents(option.price);
        }
      }
    }

    return extraPriceCents;
  }

  private toCents(value: string): number {
    return Math.round(parseFloat(value) * 100);
  }
}
