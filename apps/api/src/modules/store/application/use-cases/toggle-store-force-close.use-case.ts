import { StoreMode } from '../../domain/store-mode.value-object';
import type {
  StoreSettingsModel,
  StoreSettingsRepository,
} from '../ports/store-settings.repository.port';

export type ToggleStoreForceCloseResult = StoreSettingsModel;

export class ToggleStoreForceCloseUseCase {
  public constructor(private readonly storeSettings: StoreSettingsRepository) {}

  public async execute(): Promise<ToggleStoreForceCloseResult> {
    const settings = await this.storeSettings.get();
    const mode = StoreMode.fromFlags(settings).toggleForceClose();

    return this.storeSettings.save({
      ...settings,
      ...mode.toFlags(),
    });
  }
}
