export type CustomerLoyaltyTransactionReadModel = {
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly points: number;
  readonly type: string;
};

export type CustomerLoyaltyReadModel = {
  readonly balance: number;
  readonly page: number;
  readonly total: number;
  readonly totalPages: number;
  readonly transactions: readonly CustomerLoyaltyTransactionReadModel[];
};
