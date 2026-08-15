import type { WeeklySchedule } from '@cardapio/shared';

export const STORE_SETTINGS_REPOSITORY = Symbol('StoreSettingsRepository');

export type StoreSettingsModel = {
  readonly bannerUrl?: string;
  readonly closingTime: string;
  readonly forceClose: boolean;
  readonly forceOpen: boolean;
  readonly freeNightDeliveryEnabled?: boolean;
  readonly freeNightDeliveryStart?: string;
  readonly freeNightDeliveryEnd?: string;
  readonly id: number;
  readonly metaPixelEnabled: boolean;
  readonly metaPixelIds: readonly string[];
  readonly openDays: readonly number[];
  readonly openingTime: string;
  readonly pointsPerReal: string;
  readonly receiptAddress?: string;
  readonly receiptCnpj?: string;
  readonly receiptFooter?: string;
  readonly receiptPhone?: string;
  readonly weeklySchedule?: WeeklySchedule | null;
};

export interface StoreSettingsRepository {
  get(): Promise<StoreSettingsModel>;
  save(settings: StoreSettingsModel): Promise<StoreSettingsModel>;
}
