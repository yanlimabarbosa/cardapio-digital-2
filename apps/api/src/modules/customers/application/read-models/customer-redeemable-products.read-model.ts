export type CustomerRedeemableProductReadModel = {
  readonly canRedeem: boolean;
  readonly id: string;
  readonly imageUrl: string | null;
  readonly name: string;
  readonly price: number;
  readonly redemptionCost: number;
};

export type CustomerRedeemableProductsReadModel = {
  readonly balance: number;
  readonly products: readonly CustomerRedeemableProductReadModel[];
};
