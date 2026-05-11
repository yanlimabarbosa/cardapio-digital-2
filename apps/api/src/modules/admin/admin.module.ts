import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { Category, Product, ProductExtra, Order, OptionGroup } from '../../entities';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { CustomersModule } from '../customers/customers.module';
import { StoreModule } from '../store/store.module';
import { MikroOrmAdminDashboardReadRepository } from './adapters/persistence/mikro-orm-admin-dashboard.read-repository';
import { MikroOrmAdminCategoryReadRepository } from './adapters/persistence/mikro-orm-admin-category.read-repository';
import { MikroOrmAdminOptionGroupWriteRepository } from './adapters/persistence/mikro-orm-admin-option-group-write.repository';
import { MikroOrmAdminOrderReadRepository } from './adapters/persistence/mikro-orm-admin-order.read-repository';
import { MikroOrmAdminProductReadRepository } from './adapters/persistence/mikro-orm-admin-product.read-repository';
import { MikroOrmAdminCategoryWriteRepository } from './adapters/persistence/mikro-orm-admin-category-write.repository';
import { MikroOrmAdminProductExtraWriteRepository } from './adapters/persistence/mikro-orm-admin-product-extra-write.repository';
import { MikroOrmAdminProductWriteRepository } from './adapters/persistence/mikro-orm-admin-product-write.repository';
import {
  ADMIN_CATEGORY_READ_REPOSITORY,
  type AdminCategoryReadRepository,
} from './application/ports/admin-category.read-repository.port';
import {
  ADMIN_DASHBOARD_READ_REPOSITORY,
  type AdminDashboardReadRepository,
} from './application/ports/admin-dashboard.read-repository.port';
import {
  ADMIN_PRODUCT_READ_REPOSITORY,
  type AdminProductReadRepository,
} from './application/ports/admin-product.read-repository.port';
import {
  ADMIN_ORDER_READ_REPOSITORY,
  type AdminOrderReadRepository,
} from './application/ports/admin-order.read-repository.port';
import {
  ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY,
  type AdminProductExtraWriteRepository,
} from './application/ports/admin-product-extra-write.repository.port';
import {
  ADMIN_OPTION_GROUP_WRITE_REPOSITORY,
  type AdminOptionGroupWriteRepository,
} from './application/ports/admin-option-group-write.repository.port';
import {
  ADMIN_CATEGORY_WRITE_REPOSITORY,
  type AdminCategoryWriteRepository,
} from './application/ports/admin-category-write.repository.port';
import {
  ADMIN_PRODUCT_WRITE_REPOSITORY,
  type AdminProductWriteRepository,
} from './application/ports/admin-product-write.repository.port';
import { GetAdminDashboardUseCase } from './application/use-cases/get-admin-dashboard.use-case';
import { ListAdminCategoriesUseCase } from './application/use-cases/list-admin-categories.use-case';
import { CreateAdminProductExtraUseCase } from './application/use-cases/create-admin-product-extra.use-case';
import { DeleteAdminProductExtraUseCase } from './application/use-cases/delete-admin-product-extra.use-case';
import { UpdateAdminProductExtraUseCase } from './application/use-cases/update-admin-product-extra.use-case';
import { ListAdminFeaturedProductsUseCase } from './application/use-cases/list-admin-featured-products.use-case';
import { ListAdminOptionGroupsUseCase } from './application/use-cases/list-admin-option-groups.use-case';
import { ListAdminOrderHistoryUseCase } from './application/use-cases/list-admin-order-history.use-case';
import { ListAdminOrdersUseCase } from './application/use-cases/list-admin-orders.use-case';
import { ListAdminProductExtrasUseCase } from './application/use-cases/list-admin-product-extras.use-case';
import { ListAdminProductsUseCase } from './application/use-cases/list-admin-products.use-case';
import { ReorderAdminCategoriesUseCase } from './application/use-cases/reorder-admin-categories.use-case';
import { ReorderAdminGroupOptionsUseCase } from './application/use-cases/reorder-admin-group-options.use-case';
import { ReorderAdminProductsUseCase } from './application/use-cases/reorder-admin-products.use-case';
import { SetAdminFeaturedProductsUseCase } from './application/use-cases/set-admin-featured-products.use-case';
import { CreateAdminGroupOptionUseCase } from './application/use-cases/create-admin-group-option.use-case';
import { DeleteAdminGroupOptionUseCase } from './application/use-cases/delete-admin-group-option.use-case';
import { UpdateAdminGroupOptionUseCase } from './application/use-cases/update-admin-group-option.use-case';
import { CreateAdminOptionGroupUseCase } from './application/use-cases/create-admin-option-group.use-case';
import { DeleteAdminOptionGroupUseCase } from './application/use-cases/delete-admin-option-group.use-case';
import { ReorderAdminOptionGroupsUseCase } from './application/use-cases/reorder-admin-option-groups.use-case';
import { UpdateAdminOptionGroupUseCase } from './application/use-cases/update-admin-option-group.use-case';
import { DeleteAdminCategoryUseCase } from './application/use-cases/delete-admin-category.use-case';
import { DeleteAdminProductUseCase } from './application/use-cases/delete-admin-product.use-case';
import { ToggleAdminProductUseCase } from './application/use-cases/toggle-admin-product.use-case';
import { CreateAdminProductUseCase } from './application/use-cases/create-admin-product.use-case';
import { UpdateAdminProductUseCase } from './application/use-cases/update-admin-product.use-case';
import { UpdateAdminCategoryUseCase } from './application/use-cases/update-admin-category.use-case';
import { CreateAdminCategoryUseCase } from './application/use-cases/create-admin-category.use-case';
import { Clock } from '../../shared/application/clock/clock.port';
import { MikroOrmUnitOfWork } from '../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

const adminSystemClock: Clock = {
  now: (): Date => new Date(),
};

@Module({
  imports: [
    MikroOrmModule.forFeature([Category, Product, ProductExtra, Order, OptionGroup]),
    AuthModule,
    CustomersModule,
    StoreModule,
  ],
  controllers: [AdminController],
  providers: [
    {
      provide: ADMIN_DASHBOARD_READ_REPOSITORY,
      useFactory: (em: EntityManager): AdminDashboardReadRepository =>
        new MikroOrmAdminDashboardReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ADMIN_CATEGORY_READ_REPOSITORY,
      useFactory: (em: EntityManager): AdminCategoryReadRepository =>
        new MikroOrmAdminCategoryReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ADMIN_PRODUCT_READ_REPOSITORY,
      useFactory: (em: EntityManager): AdminProductReadRepository =>
        new MikroOrmAdminProductReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ADMIN_ORDER_READ_REPOSITORY,
      useFactory: (em: EntityManager): AdminOrderReadRepository =>
        new MikroOrmAdminOrderReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ADMIN_CATEGORY_WRITE_REPOSITORY,
      useFactory: (): AdminCategoryWriteRepository => new MikroOrmAdminCategoryWriteRepository(),
    },
    {
      provide: ADMIN_PRODUCT_WRITE_REPOSITORY,
      useFactory: (): AdminProductWriteRepository => new MikroOrmAdminProductWriteRepository(),
    },
    {
      provide: ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY,
      useFactory: (): AdminProductExtraWriteRepository =>
        new MikroOrmAdminProductExtraWriteRepository(),
    },
    {
      provide: ADMIN_OPTION_GROUP_WRITE_REPOSITORY,
      useFactory: (): AdminOptionGroupWriteRepository =>
        new MikroOrmAdminOptionGroupWriteRepository(),
    },
    {
      provide: MikroOrmUnitOfWork,
      useFactory: (em: EntityManager): MikroOrmUnitOfWork => new MikroOrmUnitOfWork(em),
      inject: [EntityManager],
    },
    {
      provide: GetAdminDashboardUseCase,
      useFactory: (dashboard: AdminDashboardReadRepository): GetAdminDashboardUseCase =>
        new GetAdminDashboardUseCase(dashboard, adminSystemClock),
      inject: [ADMIN_DASHBOARD_READ_REPOSITORY],
    },
    {
      provide: ListAdminCategoriesUseCase,
      useFactory: (categories: AdminCategoryReadRepository): ListAdminCategoriesUseCase =>
        new ListAdminCategoriesUseCase(categories),
      inject: [ADMIN_CATEGORY_READ_REPOSITORY],
    },
    {
      provide: ListAdminProductsUseCase,
      useFactory: (products: AdminProductReadRepository): ListAdminProductsUseCase =>
        new ListAdminProductsUseCase(products),
      inject: [ADMIN_PRODUCT_READ_REPOSITORY],
    },
    {
      provide: ListAdminFeaturedProductsUseCase,
      useFactory: (products: AdminProductReadRepository): ListAdminFeaturedProductsUseCase =>
        new ListAdminFeaturedProductsUseCase(products),
      inject: [ADMIN_PRODUCT_READ_REPOSITORY],
    },
    {
      provide: ListAdminProductExtrasUseCase,
      useFactory: (products: AdminProductReadRepository): ListAdminProductExtrasUseCase =>
        new ListAdminProductExtrasUseCase(products),
      inject: [ADMIN_PRODUCT_READ_REPOSITORY],
    },
    {
      provide: ListAdminOptionGroupsUseCase,
      useFactory: (products: AdminProductReadRepository): ListAdminOptionGroupsUseCase =>
        new ListAdminOptionGroupsUseCase(products),
      inject: [ADMIN_PRODUCT_READ_REPOSITORY],
    },
    {
      provide: ListAdminOrdersUseCase,
      useFactory: (orders: AdminOrderReadRepository): ListAdminOrdersUseCase =>
        new ListAdminOrdersUseCase(orders, adminSystemClock),
      inject: [ADMIN_ORDER_READ_REPOSITORY],
    },
    {
      provide: ListAdminOrderHistoryUseCase,
      useFactory: (orders: AdminOrderReadRepository): ListAdminOrderHistoryUseCase =>
        new ListAdminOrderHistoryUseCase(orders),
      inject: [ADMIN_ORDER_READ_REPOSITORY],
    },
    {
      provide: CreateAdminOptionGroupUseCase,
      useFactory: (
        optionGroups: AdminOptionGroupWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): CreateAdminOptionGroupUseCase =>
        new CreateAdminOptionGroupUseCase(optionGroups, unitOfWork),
      inject: [ADMIN_OPTION_GROUP_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: UpdateAdminOptionGroupUseCase,
      useFactory: (
        optionGroups: AdminOptionGroupWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): UpdateAdminOptionGroupUseCase =>
        new UpdateAdminOptionGroupUseCase(optionGroups, unitOfWork),
      inject: [ADMIN_OPTION_GROUP_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: DeleteAdminOptionGroupUseCase,
      useFactory: (
        optionGroups: AdminOptionGroupWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): DeleteAdminOptionGroupUseCase =>
        new DeleteAdminOptionGroupUseCase(optionGroups, unitOfWork),
      inject: [ADMIN_OPTION_GROUP_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: ReorderAdminOptionGroupsUseCase,
      useFactory: (
        optionGroups: AdminOptionGroupWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): ReorderAdminOptionGroupsUseCase =>
        new ReorderAdminOptionGroupsUseCase(optionGroups, unitOfWork),
      inject: [ADMIN_OPTION_GROUP_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: CreateAdminProductExtraUseCase,
      useFactory: (
        extras: AdminProductExtraWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): CreateAdminProductExtraUseCase =>
        new CreateAdminProductExtraUseCase(extras, unitOfWork),
      inject: [ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: CreateAdminGroupOptionUseCase,
      useFactory: (
        extras: AdminProductExtraWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): CreateAdminGroupOptionUseCase =>
        new CreateAdminGroupOptionUseCase(extras, unitOfWork),
      inject: [ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: UpdateAdminGroupOptionUseCase,
      useFactory: (
        extras: AdminProductExtraWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): UpdateAdminGroupOptionUseCase =>
        new UpdateAdminGroupOptionUseCase(extras, unitOfWork),
      inject: [ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: DeleteAdminGroupOptionUseCase,
      useFactory: (
        extras: AdminProductExtraWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): DeleteAdminGroupOptionUseCase =>
        new DeleteAdminGroupOptionUseCase(extras, unitOfWork),
      inject: [ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: ReorderAdminGroupOptionsUseCase,
      useFactory: (
        extras: AdminProductExtraWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): ReorderAdminGroupOptionsUseCase =>
        new ReorderAdminGroupOptionsUseCase(extras, unitOfWork),
      inject: [ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: UpdateAdminProductExtraUseCase,
      useFactory: (
        extras: AdminProductExtraWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): UpdateAdminProductExtraUseCase =>
        new UpdateAdminProductExtraUseCase(extras, unitOfWork),
      inject: [ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: DeleteAdminProductExtraUseCase,
      useFactory: (
        extras: AdminProductExtraWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): DeleteAdminProductExtraUseCase =>
        new DeleteAdminProductExtraUseCase(extras, unitOfWork),
      inject: [ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: ReorderAdminCategoriesUseCase,
      useFactory: (
        categories: AdminCategoryWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): ReorderAdminCategoriesUseCase =>
        new ReorderAdminCategoriesUseCase(categories, unitOfWork),
      inject: [ADMIN_CATEGORY_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: ReorderAdminProductsUseCase,
      useFactory: (
        products: AdminProductWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): ReorderAdminProductsUseCase =>
        new ReorderAdminProductsUseCase(products, unitOfWork),
      inject: [ADMIN_PRODUCT_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: SetAdminFeaturedProductsUseCase,
      useFactory: (
        products: AdminProductWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): SetAdminFeaturedProductsUseCase =>
        new SetAdminFeaturedProductsUseCase(products, unitOfWork),
      inject: [ADMIN_PRODUCT_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: DeleteAdminCategoryUseCase,
      useFactory: (
        categories: AdminCategoryWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): DeleteAdminCategoryUseCase =>
        new DeleteAdminCategoryUseCase(categories, unitOfWork),
      inject: [ADMIN_CATEGORY_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: DeleteAdminProductUseCase,
      useFactory: (
        products: AdminProductWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): DeleteAdminProductUseCase =>
        new DeleteAdminProductUseCase(products, unitOfWork),
      inject: [ADMIN_PRODUCT_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: ToggleAdminProductUseCase,
      useFactory: (
        products: AdminProductWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): ToggleAdminProductUseCase =>
        new ToggleAdminProductUseCase(products, unitOfWork),
      inject: [ADMIN_PRODUCT_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: CreateAdminProductUseCase,
      useFactory: (
        products: AdminProductWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): CreateAdminProductUseCase =>
        new CreateAdminProductUseCase(products, unitOfWork),
      inject: [ADMIN_PRODUCT_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: UpdateAdminProductUseCase,
      useFactory: (
        products: AdminProductWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): UpdateAdminProductUseCase =>
        new UpdateAdminProductUseCase(products, unitOfWork),
      inject: [ADMIN_PRODUCT_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: UpdateAdminCategoryUseCase,
      useFactory: (
        categories: AdminCategoryWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): UpdateAdminCategoryUseCase =>
        new UpdateAdminCategoryUseCase(categories, unitOfWork),
      inject: [ADMIN_CATEGORY_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: CreateAdminCategoryUseCase,
      useFactory: (
        categories: AdminCategoryWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): CreateAdminCategoryUseCase =>
        new CreateAdminCategoryUseCase(categories, unitOfWork),
      inject: [ADMIN_CATEGORY_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
  ],
})
export class AdminModule {}
