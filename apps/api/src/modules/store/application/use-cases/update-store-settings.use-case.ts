import type { WeeklySchedule } from '@cardapio/shared';
import { StoreMode, type StoreModeUpdate } from '../../domain/store-mode.value-object';
import { StoreSchedule } from '../../domain/store-schedule.value-object';
import type {
  StoreSettingsModel,
  StoreSettingsRepository,
} from '../ports/store-settings.repository.port';

export type UpdateStoreSettingsData = Partial<{
  readonly bannerUrl: string;
  readonly closingTime: string;
  readonly forceClose: boolean;
  readonly forceOpen: boolean;
  readonly metaPixelEnabled: boolean;
  readonly metaPixelIds: readonly string[];
  readonly openDays: readonly number[];
  readonly openingTime: string;
  readonly pointsPerReal: number | string;
  readonly receiptAddress: string;
  readonly receiptCnpj: string;
  readonly receiptFooter: string;
  readonly receiptPhone: string;
  readonly weeklySchedule: WeeklySchedule | null;
}>;

export type UpdateStoreSettingsCommand = {
  readonly data: UpdateStoreSettingsData;
};

export type UpdateStoreSettingsResult = StoreSettingsModel;

export class UpdateStoreSettingsUseCase {
  public constructor(private readonly storeSettings: StoreSettingsRepository) {}

  public async execute(command: UpdateStoreSettingsCommand): Promise<UpdateStoreSettingsResult> {
    const current = await this.storeSettings.get();

    if (!this.hasUpdate(command.data)) {
      return current;
    }

    const next = this.applyUpdate(current, command.data);

    return this.storeSettings.save(next);
  }

  private applyUpdate(settings: StoreSettingsModel, data: UpdateStoreSettingsData): StoreSettingsModel {
    let next: StoreSettingsModel = { ...settings };

    if (data.openingTime !== undefined) {
      next = { ...next, openingTime: data.openingTime };
    }

    if (data.closingTime !== undefined) {
      next = { ...next, closingTime: data.closingTime };
    }

    if (data.openDays !== undefined) {
      next = { ...next, openDays: [...data.openDays] };
    }

    if (data.weeklySchedule !== undefined) {
      next = {
        ...next,
        weeklySchedule: StoreSchedule.fromSettings({ weeklySchedule: data.weeklySchedule }).toWeeklySchedule(),
      };
    }

    const modeUpdate = this.getModeUpdate(data);

    if (modeUpdate) {
      next = {
        ...next,
        ...StoreMode.fromFlags(next).applyAdminUpdate(modeUpdate).toFlags(),
      };
    }

    if (data.pointsPerReal !== undefined) {
      next = { ...next, pointsPerReal: String(data.pointsPerReal) };
    }

    if (data.metaPixelEnabled !== undefined) {
      next = { ...next, metaPixelEnabled: data.metaPixelEnabled };
    }

    if (data.metaPixelIds !== undefined) {
      next = { ...next, metaPixelIds: this.normalizePixelIds(data.metaPixelIds) };
    }

    if (data.receiptCnpj !== undefined) {
      next = { ...next, receiptCnpj: data.receiptCnpj };
    }

    if (data.receiptAddress !== undefined) {
      next = { ...next, receiptAddress: data.receiptAddress };
    }

    if (data.receiptPhone !== undefined) {
      next = { ...next, receiptPhone: data.receiptPhone };
    }

    if (data.receiptFooter !== undefined) {
      next = { ...next, receiptFooter: data.receiptFooter };
    }

    if (data.bannerUrl !== undefined) {
      next = { ...next, bannerUrl: data.bannerUrl };
    }

    return next;
  }

  private getModeUpdate(data: UpdateStoreSettingsData): StoreModeUpdate | null {
    if (data.forceClose === undefined && data.forceOpen === undefined) {
      return null;
    }

    return {
      forceClose: data.forceClose,
      forceOpen: data.forceOpen,
    };
  }

  private hasUpdate(data: UpdateStoreSettingsData): boolean {
    return (
      data.openingTime !== undefined
      || data.closingTime !== undefined
      || data.openDays !== undefined
      || data.weeklySchedule !== undefined
      || data.forceClose !== undefined
      || data.forceOpen !== undefined
      || data.metaPixelEnabled !== undefined
      || data.metaPixelIds !== undefined
      || data.pointsPerReal !== undefined
      || data.receiptCnpj !== undefined
      || data.receiptAddress !== undefined
      || data.receiptPhone !== undefined
      || data.receiptFooter !== undefined
      || data.bannerUrl !== undefined
    );
  }

  private normalizePixelIds(ids: readonly string[]): readonly string[] {
    return Array.from(
      new Set(
        ids
          .map((id) => id.trim())
          .filter((id) => /^\d{5,32}$/.test(id)),
      ),
    );
  }
}
