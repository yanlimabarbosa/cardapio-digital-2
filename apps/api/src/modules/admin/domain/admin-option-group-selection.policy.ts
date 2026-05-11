export type AdminOptionGroupSelectionInput = {
  readonly maxSelections?: number;
  readonly minSelections?: number;
};

export type AdminOptionGroupSelection = {
  readonly maxSelections: number;
  readonly minSelections: number;
};

export class InvalidAdminOptionGroupSelectionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidAdminOptionGroupSelectionError';
  }
}

export class AdminOptionGroupSelectionPolicy {
  private constructor(private readonly input: AdminOptionGroupSelectionInput) {}

  public static for(input: AdminOptionGroupSelectionInput): AdminOptionGroupSelectionPolicy {
    return new AdminOptionGroupSelectionPolicy(input);
  }

  public resolveForCreate(): AdminOptionGroupSelection {
    if (
      this.input.minSelections !== undefined &&
      this.input.maxSelections !== undefined &&
      this.input.minSelections > this.input.maxSelections
    ) {
      throw new InvalidAdminOptionGroupSelectionError(
        'minSelections cannot be greater than maxSelections',
      );
    }

    return {
      minSelections: this.input.minSelections ?? 0,
      maxSelections: this.input.maxSelections ?? 1,
    };
  }

  public resolveForUpdate(changes: AdminOptionGroupSelectionInput): AdminOptionGroupSelection {
    const minSelections = changes.minSelections ?? this.input.minSelections ?? 0;
    const maxSelections = changes.maxSelections ?? this.input.maxSelections ?? 1;

    this.assertSelectionRange(minSelections, maxSelections);

    return { minSelections, maxSelections };
  }

  private assertSelectionRange(minSelections: number, maxSelections: number): void {
    if (minSelections > maxSelections) {
      throw new InvalidAdminOptionGroupSelectionError(
        'minSelections cannot be greater than maxSelections',
      );
    }
  }
}
