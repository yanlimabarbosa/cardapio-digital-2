import {
  getCombinedScheduleAvailability,
  getRangesForDay,
  getZonedParts,
  type WeeklySchedule,
} from '@cardapio/shared';

export interface StoreAvailabilityInput {
  readonly at: Date;
  readonly forceClose: boolean;
  readonly forceOpen: boolean;
  readonly ignoreForceOpen: boolean;
  readonly weeklySchedule: WeeklySchedule;
  readonly openingTime?: string;
  readonly closingTime?: string;
  readonly openDays?: readonly number[];
  readonly bannerUrl?: string;
}

export interface StoreAvailabilityResult {
  readonly open: boolean;
  readonly reason?: string;
  readonly opensAt?: string;
  readonly closesAt?: string;
  readonly openDays?: readonly number[];
  readonly weeklySchedule?: WeeklySchedule;
  readonly nextOpenAt?: string;
  readonly nextOpenLabel?: string;
  readonly bannerUrl?: string;
}

type StoreAvailabilityBase = Omit<StoreAvailabilityResult, 'open' | 'reason' | 'nextOpenAt' | 'nextOpenLabel'>;

export class StoreAvailabilityPolicy {
  private constructor(private readonly input: StoreAvailabilityInput) {
    if (Number.isNaN(input.at.getTime())) {
      throw new Error('Store availability requires a valid date');
    }
  }

  public static create(input: StoreAvailabilityInput): StoreAvailabilityPolicy {
    return new StoreAvailabilityPolicy(input);
  }

  public evaluate(): StoreAvailabilityResult {
    const base = this.baseResult();

    if (this.input.forceClose) {
      return {
        open: false,
        reason: 'Estamos temporariamente fechados',
        ...base,
      };
    }

    if (this.input.forceOpen && !this.input.ignoreForceOpen) {
      return {
        open: true,
        ...base,
      };
    }

    const availability = getCombinedScheduleAvailability(
      [{ schedule: this.input.weeklySchedule, defaultAvailable: false }],
      this.input.at,
    );

    if (!availability.available) {
      return {
        open: false,
        reason: availability.nextAvailableLabel
          ? availability.nextAvailableLabel.replace('Disponível', 'Abrimos')
          : 'Fechado hoje',
        nextOpenAt: availability.nextAvailableAt,
        nextOpenLabel: availability.nextAvailableLabel,
        ...base,
      };
    }

    return {
      open: true,
      ...base,
    };
  }

  private baseResult(): StoreAvailabilityBase {
    const dayRanges = getRangesForDay(this.input.weeklySchedule, getZonedParts(this.input.at).weekday);

    return {
      opensAt: dayRanges[0]?.start ?? this.input.openingTime,
      closesAt: dayRanges[dayRanges.length - 1]?.end ?? this.input.closingTime,
      openDays: this.input.openDays,
      weeklySchedule: this.input.weeklySchedule,
      bannerUrl: this.input.bannerUrl,
    };
  }
}
