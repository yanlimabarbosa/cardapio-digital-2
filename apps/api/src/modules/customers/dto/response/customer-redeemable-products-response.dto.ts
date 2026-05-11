export class CustomerRedeemableProductResponseDto {
  public constructor(
    /** Product identifier. */
    public readonly id: string,
    /** Product display name. */
    public readonly name: string,
    /** Product image URL, when available. */
    public readonly imageUrl: string | null,
    /** Product price as a number. */
    public readonly price: number,
    /** Loyalty points required to redeem this product. */
    public readonly redemptionCost: number,
    /** Whether the authenticated customer can redeem this product. */
    public readonly canRedeem: boolean,
  ) {}
}

export class CustomerRedeemableProductsResponseDto {
  public constructor(
    /** Current loyalty points balance. */
    public readonly balance: number,
    /** Active products available for loyalty redemption. */
    public readonly products: CustomerRedeemableProductResponseDto[],
  ) {}
}
