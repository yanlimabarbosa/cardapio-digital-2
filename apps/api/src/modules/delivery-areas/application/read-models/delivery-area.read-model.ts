export type DeliveryAreaReadModel = {
  readonly city: string;
  readonly fee: number;
  readonly id: string;
  readonly isActive: boolean;
  readonly matchNormalizedKeys: readonly string[];
  readonly neighborhood: string;
  readonly normalizedKey: string;
};
