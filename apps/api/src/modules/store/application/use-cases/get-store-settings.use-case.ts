import type {
  StoreSettingsModel,
  StoreSettingsRepository,
} from '../ports/store-settings.repository.port';

export type GetStoreSettingsResult = StoreSettingsModel;

export class GetStoreSettingsUseCase {
  public constructor(private readonly storeSettings: StoreSettingsRepository) {}

  public execute(): Promise<GetStoreSettingsResult> {
    return this.storeSettings.get();
  }
}
