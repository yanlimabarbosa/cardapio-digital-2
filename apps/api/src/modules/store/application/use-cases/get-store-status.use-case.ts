import type { Clock } from '../../../../shared/application/clock/clock.port';
import type { StoreSettingsRepository } from '../ports/store-settings.repository.port';
import { StoreAvailabilityPolicy, type StoreAvailabilityResult } from '../../domain/store-availability.policy';
import { StoreSchedule } from '../../domain/store-schedule.value-object';

export type GetStoreStatusCommand = {
  at?: Date;
  ignoreForceOpen?: boolean;
};

export type GetStoreStatusResult = StoreAvailabilityResult;

export class GetStoreStatusUseCase {
  public constructor(
    private readonly storeSettings: StoreSettingsRepository,
    private readonly clock: Clock,
  ) {}

  public async execute(command: GetStoreStatusCommand = {}): Promise<GetStoreStatusResult> {
    const settings = await this.storeSettings.get();
    const at = command.at ?? this.clock.now();
    const weeklySchedule = StoreSchedule.fromSettings(settings).toWeeklySchedule();

    return StoreAvailabilityPolicy.create({
      at,
      forceClose: settings.forceClose,
      forceOpen: settings.forceOpen,
      ignoreForceOpen: !!command.ignoreForceOpen,
      weeklySchedule,
      openingTime: settings.openingTime,
      closingTime: settings.closingTime,
      openDays: settings.openDays,
      bannerUrl: settings.bannerUrl,
    }).evaluate();
  }
}
