import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Category, Product, ProductExtra } from '../../entities';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [MikroOrmModule.forFeature([Category, Product, ProductExtra])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
