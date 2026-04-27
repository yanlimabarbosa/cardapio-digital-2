import { Module, Global } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DeliveryArea } from '../../entities';
import { DeliveryAreasService } from './delivery-areas.service';
import { DeliveryAreasController, AdminDeliveryAreasController } from './delivery-areas.controller';

@Global()
@Module({
  imports: [MikroOrmModule.forFeature([DeliveryArea])],
  controllers: [DeliveryAreasController, AdminDeliveryAreasController],
  providers: [DeliveryAreasService],
  exports: [DeliveryAreasService],
})
export class DeliveryAreasModule {}
