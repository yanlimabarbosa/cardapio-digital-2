export class AdjustCustomerLoyaltyTransactionResponseDto {
  public constructor(
    /** Loyalty transaction identifier. */
    public readonly id: string,
    /** Points added or removed by this adjustment. */
    public readonly points: number,
    /** Loyalty transaction type. */
    public readonly type: string,
  ) {}
}

export class AdjustCustomerLoyaltyResponseDto {
  public constructor(
    /** Updated customer loyalty balance. */
    public readonly balance: number,
    /** Loyalty transaction created for this adjustment. */
    public readonly transaction: AdjustCustomerLoyaltyTransactionResponseDto,
  ) {}
}
