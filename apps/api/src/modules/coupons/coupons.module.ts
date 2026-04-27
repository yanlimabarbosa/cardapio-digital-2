import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Coupon, CouponUsage, Customer, Product, Order } from '../../entities';
import { CouponsService } from './coupons.service';
import { CouponsController, AdminCouponsController } from './coupons.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Coupon, CouponUsage, Customer, Product, Order]),
    AuthModule,
  ],
  controllers: [CouponsController, AdminCouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
