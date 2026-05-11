export type CustomerProfileReadModel = {
  readonly hasPassword: boolean;
  readonly isAdmin: boolean;
  readonly loyaltyPoints: number;
  readonly memberSince: string;
  readonly name: string;
  readonly phone: string;
  readonly totalOrders: number;
};
