import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { Category, Product, ProductExtra, Section, SectionProduct } from '../../entities';
import { StoreModule } from '../store/store.module';
import { MikroOrmMenuReadRepository } from './adapters/persistence/mikro-orm-menu.read-repository';
import { MikroOrmSectionReadRepository } from './adapters/persistence/mikro-orm-section.read-repository';
import {
  STORE_SETTINGS_REPOSITORY,
  type StoreSettingsRepository,
} from '../store/application/ports/store-settings.repository.port';
import { GetFeaturedProductsUseCase } from './application/use-cases/get-featured-products.use-case';
import { GetProductsByIdsUseCase } from './application/use-cases/get-products-by-ids.use-case';
import { GetPublicMenuUseCase } from './application/use-cases/get-public-menu.use-case';
import { GetPublicSectionsUseCase } from './application/use-cases/get-public-sections.use-case';

@Module({
  imports: [MikroOrmModule.forFeature([Category, Product, ProductExtra, Section, SectionProduct]), StoreModule],
  providers: [
    {
      provide: MikroOrmMenuReadRepository,
      useFactory: (
        em: EntityManager,
        storeSettings: StoreSettingsRepository,
      ): MikroOrmMenuReadRepository => new MikroOrmMenuReadRepository(em, storeSettings),
      inject: [EntityManager, STORE_SETTINGS_REPOSITORY],
    },
    {
      provide: MikroOrmSectionReadRepository,
      useFactory: (
        em: EntityManager,
        storeSettings: StoreSettingsRepository,
      ): MikroOrmSectionReadRepository => new MikroOrmSectionReadRepository(em, storeSettings),
      inject: [EntityManager, STORE_SETTINGS_REPOSITORY],
    },
    {
      provide: GetPublicMenuUseCase,
      useFactory: (menuReadRepository: MikroOrmMenuReadRepository): GetPublicMenuUseCase =>
        new GetPublicMenuUseCase(menuReadRepository),
      inject: [MikroOrmMenuReadRepository],
    },
    {
      provide: GetFeaturedProductsUseCase,
      useFactory: (menuReadRepository: MikroOrmMenuReadRepository): GetFeaturedProductsUseCase =>
        new GetFeaturedProductsUseCase(menuReadRepository),
      inject: [MikroOrmMenuReadRepository],
    },
    {
      provide: GetProductsByIdsUseCase,
      useFactory: (menuReadRepository: MikroOrmMenuReadRepository): GetProductsByIdsUseCase =>
        new GetProductsByIdsUseCase(menuReadRepository),
      inject: [MikroOrmMenuReadRepository],
    },
    {
      provide: GetPublicSectionsUseCase,
      useFactory: (sectionReadRepository: MikroOrmSectionReadRepository): GetPublicSectionsUseCase =>
        new GetPublicSectionsUseCase(sectionReadRepository),
      inject: [MikroOrmSectionReadRepository],
    },
  ],
  exports: [
    GetPublicMenuUseCase,
    GetFeaturedProductsUseCase,
    GetProductsByIdsUseCase,
    GetPublicSectionsUseCase,
  ],
})
export class MenuModule {}
