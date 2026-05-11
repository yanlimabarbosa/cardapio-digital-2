import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { Section, SectionProduct } from '../../entities';
import { SectionsPublicController, SectionsAdminController } from './sections.controller';
import { MikroOrmAdminSectionReadRepository } from '../admin/adapters/persistence/mikro-orm-admin-section.read-repository';
import { MikroOrmAdminSectionWriteRepository } from '../admin/adapters/persistence/mikro-orm-admin-section-write.repository';
import {
  ADMIN_SECTION_READ_REPOSITORY,
  type AdminSectionReadRepository,
} from '../admin/application/ports/admin-section.read-repository.port';
import {
  ADMIN_SECTION_WRITE_REPOSITORY,
  type AdminSectionWriteRepository,
} from '../admin/application/ports/admin-section-write.repository.port';
import { CreateAdminSectionUseCase } from '../admin/application/use-cases/create-admin-section.use-case';
import { DeleteAdminSectionUseCase } from '../admin/application/use-cases/delete-admin-section.use-case';
import { ListAdminSectionsUseCase } from '../admin/application/use-cases/list-admin-sections.use-case';
import { ReorderAdminSectionsUseCase } from '../admin/application/use-cases/reorder-admin-sections.use-case';
import { SetAdminSectionProductsUseCase } from '../admin/application/use-cases/set-admin-section-products.use-case';
import { UpdateAdminSectionUseCase } from '../admin/application/use-cases/update-admin-section.use-case';
import { MenuModule } from '../menu/menu.module';
import { MikroOrmUnitOfWork } from '../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

@Module({
  imports: [MikroOrmModule.forFeature([Section, SectionProduct]), MenuModule],
  controllers: [SectionsPublicController, SectionsAdminController],
  providers: [
    {
      provide: ADMIN_SECTION_READ_REPOSITORY,
      useFactory: (em: EntityManager): AdminSectionReadRepository =>
        new MikroOrmAdminSectionReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ADMIN_SECTION_WRITE_REPOSITORY,
      useFactory: (): AdminSectionWriteRepository => new MikroOrmAdminSectionWriteRepository(),
    },
    {
      provide: MikroOrmUnitOfWork,
      useFactory: (em: EntityManager): MikroOrmUnitOfWork => new MikroOrmUnitOfWork(em),
      inject: [EntityManager],
    },
    {
      provide: CreateAdminSectionUseCase,
      useFactory: (
        sections: AdminSectionWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): CreateAdminSectionUseCase => new CreateAdminSectionUseCase(sections, unitOfWork),
      inject: [ADMIN_SECTION_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: DeleteAdminSectionUseCase,
      useFactory: (
        sections: AdminSectionWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): DeleteAdminSectionUseCase => new DeleteAdminSectionUseCase(sections, unitOfWork),
      inject: [ADMIN_SECTION_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: ReorderAdminSectionsUseCase,
      useFactory: (
        sections: AdminSectionWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): ReorderAdminSectionsUseCase => new ReorderAdminSectionsUseCase(sections, unitOfWork),
      inject: [ADMIN_SECTION_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: SetAdminSectionProductsUseCase,
      useFactory: (
        sections: AdminSectionWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): SetAdminSectionProductsUseCase => new SetAdminSectionProductsUseCase(sections, unitOfWork),
      inject: [ADMIN_SECTION_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: UpdateAdminSectionUseCase,
      useFactory: (
        sections: AdminSectionWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): UpdateAdminSectionUseCase => new UpdateAdminSectionUseCase(sections, unitOfWork),
      inject: [ADMIN_SECTION_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: ListAdminSectionsUseCase,
      useFactory: (sections: AdminSectionReadRepository): ListAdminSectionsUseCase =>
        new ListAdminSectionsUseCase(sections),
      inject: [ADMIN_SECTION_READ_REPOSITORY],
    },
  ],
})
export class SectionsModule {}
