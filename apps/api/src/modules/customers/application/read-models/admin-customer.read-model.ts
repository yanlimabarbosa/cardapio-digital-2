export type AdminCustomerReadModel = {
  readonly hasPassword: boolean;
  readonly isAdmin: boolean;
  readonly loyaltyPoints: number;
  readonly memberSince: string;
  readonly name: string;
  readonly phone: string;
  readonly totalOrders: number;
};
