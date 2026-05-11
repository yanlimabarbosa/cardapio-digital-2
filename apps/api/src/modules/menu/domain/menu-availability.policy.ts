import {
  getCombinedScheduleAvailability,
  normalizeWeeklySchedule,
  type ScheduleAvailability,
  type WeeklySchedule,
} from '@cardapio/shared';

export interface MenuAvailabilityContext {
  readonly at: Date;
  readonly forceClose: boolean;
  readonly storeSchedule: WeeklySchedule;
  readonly useForcedStoreOpen: boolean;
}

export interface ScheduleAvailabilityInput {
  readonly availabilitySchedule?: WeeklySchedule | null;
}

export interface ProductInCategoryAvailabilityInput {
  readonly isActive?: boolean | null;
  readonly categoryAvailabilitySchedule?: WeeklySchedule | null;
}

export interface ProductInSectionAvailabilityInput extends ProductInCategoryAvailabilityInput {
  readonly sectionAvailabilitySchedule?: WeeklySchedule | null;
}

interface AvailabilityRule {
  readonly schedule?: WeeklySchedule | null;
  readonly defaultAvailable: boolean;
}

export class MenuAvailabilityPolicy {
  private constructor(private readonly context: MenuAvailabilityContext) {
    if (Number.isNaN(context.at.getTime())) {
      throw new Error('Menu availability requires a valid date');
    }
  }

  public static create(context: MenuAvailabilityContext): MenuAvailabilityPolicy {
    return new MenuAvailabilityPolicy(context);
  }

  public categoryAvailability(category: ScheduleAvailabilityInput): ScheduleAvailability {
    return this.evaluate([
      { schedule: category.availabilitySchedule, defaultAvailable: true },
    ]);
  }

  public sectionAvailability(section: ScheduleAvailabilityInput): ScheduleAvailability {
    return this.evaluate([
      { schedule: section.availabilitySchedule, defaultAvailable: true },
    ]);
  }

  public productInCategoryAvailability(input: ProductInCategoryAvailabilityInput): ScheduleAvailability {
    if (!(input.isActive ?? true)) {
      return { available: false };
    }

    return this.evaluate([
      { schedule: input.categoryAvailabilitySchedule, defaultAvailable: true },
    ]);
  }

  public productInSectionAvailability(input: ProductInSectionAvailabilityInput): ScheduleAvailability {
    if (!(input.isActive ?? true)) {
      return { available: false };
    }

    return this.evaluate([
      { schedule: input.categoryAvailabilitySchedule, defaultAvailable: true },
      { schedule: input.sectionAvailabilitySchedule, defaultAvailable: true },
    ]);
  }

  private evaluate(rules: readonly AvailabilityRule[]): ScheduleAvailability {
    if (this.context.forceClose) {
      return { available: false };
    }

    return getCombinedScheduleAvailability([
      ...(this.context.useForcedStoreOpen
        ? []
        : [{ schedule: this.context.storeSchedule, defaultAvailable: false }]),
      ...rules.map((rule) => ({
        schedule: normalizeWeeklySchedule(rule.schedule),
        defaultAvailable: rule.defaultAvailable,
      })),
    ], this.context.at);
  }
}
