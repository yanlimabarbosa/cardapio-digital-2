export type ProductExtraReadModel = {
  readonly id: string;
  readonly imageUrl?: string;
  readonly name: string;
  readonly price: number;
};

export type ProductOptionReadModel = ProductExtraReadModel;

export type ProductOptionGroupReadModel = {
  readonly id: string;
  readonly maxSelections: number;
  readonly minSelections: number;
  readonly name: string;
  readonly options: readonly ProductOptionReadModel[];
  readonly required: boolean;
  readonly sortOrder: number;
  readonly combinedLimitId?: string;
};

export type ProductReadModel = {
  readonly availabilityMessage?: string;
  readonly combinedLimits?: readonly { id: string; name: string; maxSelections: number }[];
  readonly description?: string;
  readonly effectivePrice: number;
  readonly extras: readonly ProductExtraReadModel[];
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly isAvailable: boolean;
  readonly isCompound: boolean;
  readonly isPromotional: boolean;
  readonly name: string;
  readonly nextAvailableAt?: string;
  readonly optionGroups?: readonly ProductOptionGroupReadModel[];
  readonly price: number;
  readonly promotionActive: boolean;
  readonly promotionalPrice: number | null;
};
