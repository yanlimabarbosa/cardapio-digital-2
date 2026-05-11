export class AdminProductMutationCategoryResponseDto {
  public constructor(
    /** Product category identifier. */
    public readonly id: string,
    /** Product category display name. */
    public readonly name: string,
  ) {}
}

export class AdminProductMutationResponseDto {
  public constructor(
    /** Product identifier. */
    public readonly id: string,
    /** Product category summary. */
    public readonly category: AdminProductMutationCategoryResponseDto,
    /** Product display name. */
    public readonly name: string,
    /** Optional product description. */
    public readonly description: string | undefined,
    /** Product base price formatted as persisted decimal text. */
    public readonly price: string,
    /** Optional product image URL. */
    public readonly imageUrl: string | undefined,
    /** Sort position in the admin product list. */
    public readonly sortOrder: number,
    /** Whether the product is currently active. */
    public readonly isActive: boolean,
    /** Whether the product is highlighted as featured. */
    public readonly isFeatured: boolean,
    /** Sort position inside featured products. */
    public readonly featuredOrder: number,
    /** Whether promotional pricing is enabled. */
    public readonly isPromotional: boolean,
    /** Promotional price formatted as persisted decimal text. */
    public readonly promotionalPrice: string | undefined,
    /** Promotion start timestamp. */
    public readonly promotionStartDate: Date | undefined,
    /** Promotion end timestamp. */
    public readonly promotionEndDate: Date | undefined,
    /** Whether the product uses option groups. */
    public readonly isCompound: boolean,
    /** Whether this product can be redeemed with loyalty points. */
    public readonly isRedeemable: boolean,
    /** Loyalty points required to redeem this product. */
    public readonly redemptionCost: number,
    /** Product creation timestamp. */
    public readonly createdAt: Date | undefined,
    /** Product last update timestamp. */
    public readonly updatedAt: Date | undefined,
  ) {}
}
