import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Order, OrderItem, Product, ProductExtra, Customer, LoyaltyTransaction, StoreSettings } from '../../entities';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthModule } from '../auth/auth.module';
import { CustomersModule } from '../customers/customers.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Order, OrderItem, Product, ProductExtra, Customer, LoyaltyTransaction, StoreSettings]),
    AuthModule,
    CustomersModule,
    CouponsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
