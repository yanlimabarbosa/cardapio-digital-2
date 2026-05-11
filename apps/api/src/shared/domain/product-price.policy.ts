export interface ProductPriceInput {
  readonly price: string;
  readonly isPromotional?: boolean | null;
  readonly promotionalPrice?: string | null;
  readonly promotionStartDate?: Date | null;
  readonly promotionEndDate?: Date | null;
}

export class ProductPricePolicy {
  private constructor(private readonly input: ProductPriceInput) {}

  public static create(input: ProductPriceInput): ProductPricePolicy {
    return new ProductPricePolicy(input);
  }

  public isPromotionActive(at: Date = new Date()): boolean {
    this.assertValidDate(at);

    const promotionalPrice = this.input.promotionalPrice;
    if (!this.input.isPromotional || !promotionalPrice) {
      return false;
    }

    if (this.input.promotionStartDate && at < this.input.promotionStartDate) {
      return false;
    }

    if (this.input.promotionEndDate && at > this.input.promotionEndDate) {
      return false;
    }

    return true;
  }

  public effectivePrice(at: Date = new Date()): string {
    const promotionalPrice = this.input.promotionalPrice;
    if (this.isPromotionActive(at) && promotionalPrice) {
      return promotionalPrice;
    }

    return this.input.price;
  }

  private assertValidDate(at: Date): void {
    if (Number.isNaN(at.getTime())) {
      throw new Error('Product pricing requires a valid date');
    }
  }
}
