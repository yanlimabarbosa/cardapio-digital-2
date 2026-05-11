import { StoreMode } from '../../domain/store-mode.value-object';
import type {
  StoreSettingsModel,
  StoreSettingsRepository,
} from '../ports/store-settings.repository.port';

export type ToggleStoreForceOpenResult = StoreSettingsModel;

export class ToggleStoreForceOpenUseCase {
  public constructor(private readonly storeSettings: StoreSettingsRepository) {}

  public async execute(): Promise<ToggleStoreForceOpenResult> {
    const settings = await this.storeSettings.get();
    const mode = StoreMode.fromFlags(settings).toggleForceOpen();

    return this.storeSettings.save({
      ...settings,
      ...mode.toFlags(),
    });
  }
}
