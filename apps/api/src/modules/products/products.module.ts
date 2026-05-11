import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [MenuModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
