export type AdminProductExtraReadModel = {
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly isSoldOut: boolean;
  readonly name: string;
  readonly price: number;
  readonly sortOrder: number;
};

export type AdminProductOptionGroupReadModel = {
  readonly id: string;
  readonly isActive: boolean;
  readonly maxSelections: number;
  readonly minSelections: number;
  readonly name: string;
  readonly options: readonly AdminProductExtraReadModel[];
  readonly sortOrder: number;
};

export type AdminProductReadModel = {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly createdAt?: Date;
  readonly description?: string;
  readonly extras: readonly AdminProductExtraReadModel[];
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly isSoldOut: boolean;
  readonly isCompound: boolean;
  readonly isRedeemable: boolean;
  readonly name: string;
  readonly optionGroups: readonly AdminProductOptionGroupReadModel[];
  readonly price: number;
  readonly redemptionCost: number;
  readonly sortOrder: number;
};
