export const CUSTOMER_REDEEMABLE_PRODUCTS_READ_REPOSITORY = Symbol(
  'CUSTOMER_REDEEMABLE_PRODUCTS_READ_REPOSITORY',
);

export type CustomerRedeemableProductRecord = {
  readonly id: string;
  readonly imageUrl: string | null;
  readonly name: string;
  readonly price: string;
  readonly redemptionCost: number | null;
};

export type CustomerRedeemableProductsRecord = {
  readonly balance: number;
  readonly products: readonly CustomerRedeemableProductRecord[];
};

export interface CustomerRedeemableProductsReadRepository {
  getByCustomerId(customerId: string): Promise<CustomerRedeemableProductsRecord | null>;
}
