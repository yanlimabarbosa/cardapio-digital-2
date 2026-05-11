import { StoreMode, type StoreModeUpdate } from '../../domain/store-mode.value-object';
import type {
  StoreSettingsModel,
  StoreSettingsRepository,
} from '../ports/store-settings.repository.port';

export type SetStoreModeCommand = StoreModeUpdate;

export type SetStoreModeResult = StoreSettingsModel;

export class SetStoreModeUseCase {
  public constructor(private readonly storeSettings: StoreSettingsRepository) {}

  public async execute(command: SetStoreModeCommand): Promise<SetStoreModeResult> {
    const settings = await this.storeSettings.get();

    if (command.forceClose === undefined && command.forceOpen === undefined) {
      return settings;
    }

    const mode = StoreMode.fromFlags(settings).applyAdminUpdate(command);

    return this.storeSettings.save({
      ...settings,
      ...mode.toFlags(),
    });
  }
}
