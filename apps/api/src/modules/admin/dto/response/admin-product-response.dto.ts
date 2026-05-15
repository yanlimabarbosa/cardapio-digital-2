export class AdminProductExtraResponseDto {
  public constructor(
    /** Extra or option identifier. */
    public readonly id: string,
    /** Extra or option display name. */
    public readonly name: string,
    /** Price charged for this extra or option. */
    public readonly price: number,
    /** Optional image URL. */
    public readonly imageUrl: string | undefined,
    /** Sort position inside the product or option group. */
    public readonly sortOrder: number,
    /** Whether this extra or option is active. */
    public readonly isActive: boolean,
    /** Whether this extra or option is visible but sold out. */
    public readonly isSoldOut: boolean,
  ) {}
}

export class AdminProductOptionGroupResponseDto {
  public constructor(
    /** Option group identifier. */
    public readonly id: string,
    /** Option group display name. */
    public readonly name: string,
    /** Minimum number of options required. */
    public readonly minSelections: number,
    /** Maximum number of options allowed. */
    public readonly maxSelections: number,
    /** Sort position inside the product. */
    public readonly sortOrder: number,
    /** Whether this option group is active. */
    public readonly isActive: boolean,
    /** Options available in this group. */
    public readonly options: AdminProductExtraResponseDto[],
  ) {}
}

export class AdminProductResponseDto {
  public constructor(
    /** Product identifier. */
    public readonly id: string,
    /** Product display name. */
    public readonly name: string,
    /** Optional product description. */
    public readonly description: string | undefined,
    /** Product base price. */
    public readonly price: number,
    /** Optional product image URL. */
    public readonly imageUrl: string | undefined,
    /** Whether the product is currently active. */
    public readonly isActive: boolean,
    /** Whether the product is visible but sold out. */
    public readonly isSoldOut: boolean,
    /** Whether the product uses option groups. */
    public readonly isCompound: boolean,
    /** Product category identifier. */
    public readonly categoryId: string,
    /** Product category display name. */
    public readonly categoryName: string,
    /** Flat extras attached directly to this product. */
    public readonly extras: AdminProductExtraResponseDto[],
    /** Compound option groups attached to this product. */
    public readonly optionGroups: AdminProductOptionGroupResponseDto[],
    /** Sort position in the admin product list. */
    public readonly sortOrder: number,
    /** Whether this product can be redeemed with loyalty points. */
    public readonly isRedeemable: boolean,
    /** Loyalty points required to redeem this product. */
    public readonly redemptionCost: number,
    /** Product creation timestamp. */
    public readonly createdAt: Date | undefined,
  ) {}
}
