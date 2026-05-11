import { Module, Global } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { StoreSettings } from '../../entities';
import { StoreController } from './store.controller';
import { Clock } from '../../shared/application/clock/clock.port';
import { MikroOrmStoreSettingsRepository } from './adapters/persistence/mikro-orm-store-settings.repository';
import {
  STORE_SETTINGS_REPOSITORY,
  type StoreSettingsRepository,
} from './application/ports/store-settings.repository.port';
import { GetStoreStatusUseCase } from './application/use-cases/get-store-status.use-case';
import { GetStoreSettingsUseCase } from './application/use-cases/get-store-settings.use-case';
import { SetStoreModeUseCase } from './application/use-cases/set-store-mode.use-case';
import { ToggleStoreForceCloseUseCase } from './application/use-cases/toggle-store-force-close.use-case';
import { ToggleStoreForceOpenUseCase } from './application/use-cases/toggle-store-force-open.use-case';
import { UpdateStoreSettingsUseCase } from './application/use-cases/update-store-settings.use-case';

@Global()
@Module({
  imports: [MikroOrmModule.forFeature([StoreSettings])],
  controllers: [StoreController],
  providers: [
    {
      provide: MikroOrmStoreSettingsRepository,
      useFactory: (em: EntityManager): MikroOrmStoreSettingsRepository => new MikroOrmStoreSettingsRepository(em),
      inject: [EntityManager],
    },
    {
      provide: STORE_SETTINGS_REPOSITORY,
      useExisting: MikroOrmStoreSettingsRepository,
    },
    {
      provide: GetStoreStatusUseCase,
      useFactory: (storeSettings: StoreSettingsRepository): GetStoreStatusUseCase =>
        new GetStoreStatusUseCase(storeSettings, systemClock),
      inject: [STORE_SETTINGS_REPOSITORY],
    },
    {
      provide: GetStoreSettingsUseCase,
      useFactory: (storeSettings: StoreSettingsRepository): GetStoreSettingsUseCase =>
        new GetStoreSettingsUseCase(storeSettings),
      inject: [STORE_SETTINGS_REPOSITORY],
    },
    {
      provide: UpdateStoreSettingsUseCase,
      useFactory: (storeSettings: StoreSettingsRepository): UpdateStoreSettingsUseCase =>
        new UpdateStoreSettingsUseCase(storeSettings),
      inject: [STORE_SETTINGS_REPOSITORY],
    },
    {
      provide: SetStoreModeUseCase,
      useFactory: (storeSettings: StoreSettingsRepository): SetStoreModeUseCase =>
        new SetStoreModeUseCase(storeSettings),
      inject: [STORE_SETTINGS_REPOSITORY],
    },
    {
      provide: ToggleStoreForceCloseUseCase,
      useFactory: (storeSettings: StoreSettingsRepository): ToggleStoreForceCloseUseCase =>
        new ToggleStoreForceCloseUseCase(storeSettings),
      inject: [STORE_SETTINGS_REPOSITORY],
    },
    {
      provide: ToggleStoreForceOpenUseCase,
      useFactory: (storeSettings: StoreSettingsRepository): ToggleStoreForceOpenUseCase =>
        new ToggleStoreForceOpenUseCase(storeSettings),
      inject: [STORE_SETTINGS_REPOSITORY],
    },
  ],
  exports: [
    STORE_SETTINGS_REPOSITORY,
    GetStoreStatusUseCase,
    GetStoreSettingsUseCase,
    UpdateStoreSettingsUseCase,
    SetStoreModeUseCase,
    ToggleStoreForceCloseUseCase,
    ToggleStoreForceOpenUseCase,
  ],
})
export class StoreModule {}

const systemClock: Clock = {
  now: (): Date => new Date(),
};
