export class CustomerLoyaltyTransactionResponseDto {
  public constructor(
    /** Loyalty transaction identifier. */
    public readonly id: string,
    /** Point delta for this transaction. */
    public readonly points: number,
    /** Loyalty transaction type. */
    public readonly type: string,
    /** Optional transaction description. */
    public readonly description: string | null,
    /** Transaction creation timestamp as an ISO string. */
    public readonly createdAt: string,
  ) {}
}

export class CustomerLoyaltyResponseDto {
  public constructor(
    /** Current loyalty points balance. */
    public readonly balance: number,
    /** Loyalty transactions for the current page. */
    public readonly transactions: CustomerLoyaltyTransactionResponseDto[],
    /** Total matching loyalty transactions. */
    public readonly total: number,
    /** Current page number. */
    public readonly page: number,
    /** Total number of transaction pages. */
    public readonly totalPages: number,
  ) {}
}
