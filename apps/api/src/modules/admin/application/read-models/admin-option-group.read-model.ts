export type AdminOptionGroupOptionReadModel = {
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly isSoldOut: boolean;
  readonly name: string;
  readonly price: number;
  readonly sortOrder: number;
};

export type AdminOptionGroupReadModel = {
  readonly combinedLimitId: string | null;
  readonly id: string;
  readonly isActive: boolean;
  readonly maxSelections: number;
  readonly minSelections: number;
  readonly name: string;
  readonly options: readonly AdminOptionGroupOptionReadModel[];
  readonly sortOrder: number;
};
