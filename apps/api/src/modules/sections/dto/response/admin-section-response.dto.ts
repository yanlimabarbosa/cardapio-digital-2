export class AdminSectionProductResponseDto {
  public constructor(
    /** Product identifier. */
    public readonly id: string,
    /** Product display name. */
    public readonly name: string,
    /** Product base price. */
    public readonly price: number,
    /** Optional product image URL. */
    public readonly imageUrl: string | undefined,
  ) {}
}

export class AdminSectionWeeklyScheduleRangeResponseDto {
  public constructor(
    /** Range start time in HH:mm format. */
    public readonly start: string,
    /** Range end time in HH:mm format. */
    public readonly end: string,
  ) {}
}

type AdminSectionWeeklyScheduleResponseDtoValues = {
  readonly 0?: AdminSectionWeeklyScheduleRangeResponseDto[];
  readonly 1?: AdminSectionWeeklyScheduleRangeResponseDto[];
  readonly 2?: AdminSectionWeeklyScheduleRangeResponseDto[];
  readonly 3?: AdminSectionWeeklyScheduleRangeResponseDto[];
  readonly 4?: AdminSectionWeeklyScheduleRangeResponseDto[];
  readonly 5?: AdminSectionWeeklyScheduleRangeResponseDto[];
  readonly 6?: AdminSectionWeeklyScheduleRangeResponseDto[];
};

export class AdminSectionWeeklyScheduleResponseDto {
  /** Sunday availability ranges. */
  declare public readonly 0?: AdminSectionWeeklyScheduleRangeResponseDto[];

  /** Monday availability ranges. */
  declare public readonly 1?: AdminSectionWeeklyScheduleRangeResponseDto[];

  /** Tuesday availability ranges. */
  declare public readonly 2?: AdminSectionWeeklyScheduleRangeResponseDto[];

  /** Wednesday availability ranges. */
  declare public readonly 3?: AdminSectionWeeklyScheduleRangeResponseDto[];

  /** Thursday availability ranges. */
  declare public readonly 4?: AdminSectionWeeklyScheduleRangeResponseDto[];

  /** Friday availability ranges. */
  declare public readonly 5?: AdminSectionWeeklyScheduleRangeResponseDto[];

  /** Saturday availability ranges. */
  declare public readonly 6?: AdminSectionWeeklyScheduleRangeResponseDto[];

  public constructor(values: AdminSectionWeeklyScheduleResponseDtoValues = {}) {
    if (values[0] !== undefined) {
      this[0] = values[0];
    }

    if (values[1] !== undefined) {
      this[1] = values[1];
    }

    if (values[2] !== undefined) {
      this[2] = values[2];
    }

    if (values[3] !== undefined) {
      this[3] = values[3];
    }

    if (values[4] !== undefined) {
      this[4] = values[4];
    }

    if (values[5] !== undefined) {
      this[5] = values[5];
    }

    if (values[6] !== undefined) {
      this[6] = values[6];
    }
  }
}

export class AdminSectionResponseDto {
  public constructor(
    /** Section identifier. */
    public readonly id: string,
    /** Section display label. */
    public readonly label: string,
    /** Optional section emoji. */
    public readonly emoji: string | undefined,
    /** Sort position in the public sections menu. */
    public readonly sortOrder: number,
    /** Whether the section is active. */
    public readonly isActive: boolean,
    /** Weekly availability schedule, or null when no section schedule is configured. */
    public readonly availabilitySchedule: AdminSectionWeeklyScheduleResponseDto | null,
    /** Number of products linked to this section. */
    public readonly productCount: number,
    /** Products linked to this section in display order. */
    public readonly products: AdminSectionProductResponseDto[],
  ) {}
}

export class AdminSectionMutationResponseDto {
  public constructor(
    /** Section identifier. */
    public readonly id: string,
    /** Section display label. */
    public readonly label: string,
    /** Optional section emoji. */
    public readonly emoji: string | undefined,
    /** Sort position in the public sections menu. */
    public readonly sortOrder: number,
    /** Whether the section is active. */
    public readonly isActive: boolean,
    /** Weekly availability schedule, or null when no section schedule is configured. */
    public readonly availabilitySchedule: AdminSectionWeeklyScheduleResponseDto | null,
  ) {}
}
