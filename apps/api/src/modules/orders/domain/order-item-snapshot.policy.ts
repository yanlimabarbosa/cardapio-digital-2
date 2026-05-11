export type OrderItemOptionSelectionInput = {
  readonly groupId: string;
  readonly optionIds: readonly string[];
};

export type OrderItemSnapshotRequest = {
  readonly extraIds?: readonly string[];
  readonly optionSelections?: readonly OrderItemOptionSelectionInput[];
  readonly quantity: number;
};

export type OrderItemSnapshotExtraInput = {
  readonly id: string;
  readonly isActive?: boolean | null;
  readonly name: string;
  readonly price: string;
};

export type OrderItemSnapshotOptionGroupInput = {
  readonly id: string;
  readonly isActive?: boolean | null;
  readonly maxSelections?: number | null;
  readonly minSelections?: number | null;
  readonly name: string;
  readonly options: readonly OrderItemSnapshotExtraInput[];
};

export type OrderItemSnapshotProductInput = {
  readonly baseUnitPriceCents: number;
  readonly extras: readonly OrderItemSnapshotExtraInput[];
  readonly id: string;
  readonly isActive?: boolean | null;
  readonly isCompound?: boolean | null;
  readonly name: string;
  readonly optionGroups: readonly OrderItemSnapshotOptionGroupInput[];
};

export type OrderItemSelectedExtra = {
  readonly name: string;
  readonly price: number;
};

export type OrderItemGroupedExtras = {
  readonly groupId: string;
  readonly groupName: string;
  readonly options: readonly OrderItemSelectedExtra[];
};

export type OrderItemSnapshot = {
  readonly extras: readonly OrderItemSelectedExtra[];
  readonly groupedExtras: readonly OrderItemGroupedExtras[];
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly subtotalCents: number;
  readonly unitPriceCents: number;
};

export class InvalidOrderItemSnapshotError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderItemSnapshotError';
  }
}

export class OrderItemSnapshotPolicy {
  private constructor(
    private readonly product: OrderItemSnapshotProductInput,
    private readonly request: OrderItemSnapshotRequest,
  ) {}

  public static for(
    product: OrderItemSnapshotProductInput,
    request: OrderItemSnapshotRequest,
  ): OrderItemSnapshotPolicy {
    return new OrderItemSnapshotPolicy(product, request);
  }

  public createSnapshot(): OrderItemSnapshot {
    this.assertProductCanBeOrdered();
    this.assertValidQuantity();

    const selection = this.resolveSelection();
    const unitPriceCents = this.baseUnitPriceCents() + selection.extrasCents;
    const subtotalCents = unitPriceCents * this.request.quantity;

    return {
      productId: this.product.id,
      productName: this.product.name,
      quantity: this.request.quantity,
      unitPriceCents,
      subtotalCents,
      extras: selection.extras,
      groupedExtras: selection.groupedExtras,
    };
  }

  private assertProductCanBeOrdered(): void {
    if (!this.product.isActive) {
      throw new InvalidOrderItemSnapshotError(`Product ${this.product.name} is unavailable`);
    }
  }

  private assertValidQuantity(): void {
    if (!Number.isInteger(this.request.quantity) || this.request.quantity < 1) {
      throw new InvalidOrderItemSnapshotError('Order item quantity must be at least 1');
    }
  }

  private resolveSelection(): {
    readonly extras: readonly OrderItemSelectedExtra[];
    readonly extrasCents: number;
    readonly groupedExtras: readonly OrderItemGroupedExtras[];
  } {
    const optionSelections = this.request.optionSelections ?? [];

    if (this.product.isCompound && optionSelections.length > 0) {
      return this.resolveCompoundSelection(optionSelections);
    }

    return this.resolveFlatExtraSelection();
  }

  private resolveCompoundSelection(
    optionSelections: readonly OrderItemOptionSelectionInput[],
  ): {
    readonly extras: readonly OrderItemSelectedExtra[];
    readonly extrasCents: number;
    readonly groupedExtras: readonly OrderItemGroupedExtras[];
  } {
    let extrasCents = 0;
    const groupedExtras: OrderItemGroupedExtras[] = [];

    for (const selection of optionSelections) {
      const group = this.product.optionGroups.find((candidate) => candidate.id === selection.groupId);

      if (!group || !group.isActive) {
        throw new InvalidOrderItemSnapshotError(`Grupo de opcoes ${selection.groupId} nao encontrado`);
      }

      const minSelections = group.minSelections ?? 0;
      const maxSelections = group.maxSelections ?? 1;

      if (selection.optionIds.length < minSelections) {
        throw new InvalidOrderItemSnapshotError(
          `Grupo "${group.name}" requer pelo menos ${minSelections} opcao(oes)`,
        );
      }

      if (selection.optionIds.length > maxSelections) {
        throw new InvalidOrderItemSnapshotError(
          `Grupo "${group.name}" permite no maximo ${maxSelections} opcao(oes)`,
        );
      }

      const groupOptions: OrderItemSelectedExtra[] = [];
      for (const optionId of selection.optionIds) {
        const option = group.options.find((candidate) => candidate.id === optionId);

        if (!option || !option.isActive) {
          throw new InvalidOrderItemSnapshotError(`Opcao ${optionId} nao encontrada no grupo "${group.name}"`);
        }

        const optionPriceCents = this.decimalToCents(option.price);
        extrasCents += optionPriceCents;
        groupOptions.push({ name: option.name, price: this.centsToNumber(optionPriceCents) });
      }

      groupedExtras.push({
        groupId: group.id,
        groupName: group.name,
        options: groupOptions,
      });
    }

    this.assertRequiredCompoundGroupsSelected(optionSelections);

    return {
      extras: [],
      extrasCents,
      groupedExtras,
    };
  }

  private assertRequiredCompoundGroupsSelected(
    optionSelections: readonly OrderItemOptionSelectionInput[],
  ): void {
    for (const group of this.product.optionGroups) {
      const minSelections = group.minSelections ?? 0;
      if (!group.isActive || minSelections <= 0) {
        continue;
      }

      const selection = optionSelections.find((candidate) => candidate.groupId === group.id);
      if (!selection || selection.optionIds.length < minSelections) {
        throw new InvalidOrderItemSnapshotError(
          `Grupo obrigatorio "${group.name}" requer pelo menos ${minSelections} opcao(oes)`,
        );
      }
    }
  }

  private resolveFlatExtraSelection(): {
    readonly extras: readonly OrderItemSelectedExtra[];
    readonly extrasCents: number;
    readonly groupedExtras: readonly OrderItemGroupedExtras[];
  } {
    const extraIds = this.request.extraIds ?? [];
    let extrasCents = 0;
    const selectedExtras: OrderItemSelectedExtra[] = [];

    for (const extraId of extraIds) {
      const extra = this.product.extras.find((candidate) => candidate.id === extraId);

      if (!extra || !extra.isActive) {
        throw new InvalidOrderItemSnapshotError(`Extra ${extraId} not found or unavailable`);
      }

      const extraPriceCents = this.decimalToCents(extra.price);
      extrasCents += extraPriceCents;
      selectedExtras.push({ name: extra.name, price: this.centsToNumber(extraPriceCents) });
    }

    return {
      extras: selectedExtras,
      extrasCents,
      groupedExtras: [],
    };
  }

  private baseUnitPriceCents(): number {
    return this.product.baseUnitPriceCents;
  }

  private decimalToCents(value: string): number {
    return Math.round(parseFloat(value) * 100);
  }

  private centsToNumber(value: number): number {
    return value / 100;
  }
}
