import { Module, Global } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { StoreSettings } from '../../entities';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Global()
@Module({
  imports: [MikroOrmModule.forFeature([StoreSettings])],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
