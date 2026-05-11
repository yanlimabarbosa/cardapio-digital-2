import { Module, Global } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { DeliveryArea } from '../../entities';
import { MikroOrmDeliveryAreaReadRepository } from './adapters/persistence/mikro-orm-delivery-area.read-repository';
import { MikroOrmDeliveryAreaWriteRepository } from './adapters/persistence/mikro-orm-delivery-area-write.repository';
import {
  DELIVERY_AREA_READ_REPOSITORY,
  type DeliveryAreaReadRepository,
} from './application/ports/delivery-area.read-repository.port';
import {
  DELIVERY_AREA_WRITE_REPOSITORY,
  type DeliveryAreaWriteRepository,
} from './application/ports/delivery-area-write.repository.port';
import { CreateDeliveryAreaUseCase } from './application/use-cases/create-delivery-area.use-case';
import { DeleteDeliveryAreaUseCase } from './application/use-cases/delete-delivery-area.use-case';
import { ListActiveDeliveryAreasUseCase } from './application/use-cases/list-active-delivery-areas.use-case';
import { ListAdminDeliveryAreasUseCase } from './application/use-cases/list-admin-delivery-areas.use-case';
import { UpdateDeliveryAreaUseCase } from './application/use-cases/update-delivery-area.use-case';
import { MikroOrmUnitOfWork } from '../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import { DeliveryAreasController, AdminDeliveryAreasController } from './delivery-areas.controller';

@Global()
@Module({
  imports: [MikroOrmModule.forFeature([DeliveryArea])],
  controllers: [DeliveryAreasController, AdminDeliveryAreasController],
  providers: [
    {
      provide: DELIVERY_AREA_READ_REPOSITORY,
      useFactory: (em: EntityManager): DeliveryAreaReadRepository =>
        new MikroOrmDeliveryAreaReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: DELIVERY_AREA_WRITE_REPOSITORY,
      useFactory: (): DeliveryAreaWriteRepository => new MikroOrmDeliveryAreaWriteRepository(),
    },
    {
      provide: MikroOrmUnitOfWork,
      useFactory: (em: EntityManager): MikroOrmUnitOfWork => new MikroOrmUnitOfWork(em),
      inject: [EntityManager],
    },
    {
      provide: CreateDeliveryAreaUseCase,
      useFactory: (
        deliveryAreas: DeliveryAreaWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): CreateDeliveryAreaUseCase => new CreateDeliveryAreaUseCase(deliveryAreas, unitOfWork),
      inject: [DELIVERY_AREA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: ListActiveDeliveryAreasUseCase,
      useFactory: (deliveryAreas: DeliveryAreaReadRepository): ListActiveDeliveryAreasUseCase =>
        new ListActiveDeliveryAreasUseCase(deliveryAreas),
      inject: [DELIVERY_AREA_READ_REPOSITORY],
    },
    {
      provide: ListAdminDeliveryAreasUseCase,
      useFactory: (deliveryAreas: DeliveryAreaReadRepository): ListAdminDeliveryAreasUseCase =>
        new ListAdminDeliveryAreasUseCase(deliveryAreas),
      inject: [DELIVERY_AREA_READ_REPOSITORY],
    },
    {
      provide: DeleteDeliveryAreaUseCase,
      useFactory: (
        deliveryAreas: DeliveryAreaWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): DeleteDeliveryAreaUseCase => new DeleteDeliveryAreaUseCase(deliveryAreas, unitOfWork),
      inject: [DELIVERY_AREA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: UpdateDeliveryAreaUseCase,
      useFactory: (
        deliveryAreas: DeliveryAreaWriteRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): UpdateDeliveryAreaUseCase => new UpdateDeliveryAreaUseCase(deliveryAreas, unitOfWork),
      inject: [DELIVERY_AREA_WRITE_REPOSITORY, MikroOrmUnitOfWork],
    },
  ],
})
export class DeliveryAreasModule {}
