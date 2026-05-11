import {
  legacyToWeeklySchedule,
  normalizeWeeklySchedule,
  type WeeklySchedule,
} from '@cardapio/shared';

export type StoreScheduleInput = {
  readonly closingTime?: string;
  readonly openDays?: readonly number[];
  readonly openingTime?: string;
  readonly weeklySchedule?: WeeklySchedule | null;
};

export class StoreSchedule {
  private constructor(private readonly weeklySchedule: WeeklySchedule) {}

  public static fromSettings(input: StoreScheduleInput): StoreSchedule {
    return new StoreSchedule(
      normalizeWeeklySchedule(input.weeklySchedule)
        ?? normalizeWeeklySchedule(
          legacyToWeeklySchedule(
            input.openDays ? [...input.openDays] : undefined,
            input.openingTime,
            input.closingTime,
          ),
        )
        ?? {},
    );
  }

  public toWeeklySchedule(): WeeklySchedule {
    return normalizeWeeklySchedule(this.weeklySchedule) ?? {};
  }
}
