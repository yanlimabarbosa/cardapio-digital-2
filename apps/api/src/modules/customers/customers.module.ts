import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Customer, Product, LoyaltyTransaction, AdminUser } from '../../entities';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerTokenGuard } from './customer-token.guard';

@Module({
  imports: [MikroOrmModule.forFeature([Customer, Product, LoyaltyTransaction, AdminUser])],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerTokenGuard],
  exports: [CustomersService, CustomerTokenGuard],
})
export class CustomersModule {}
