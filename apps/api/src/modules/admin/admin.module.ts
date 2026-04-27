import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Category, Product, ProductExtra, Order, OptionGroup } from '../../entities';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Category, Product, ProductExtra, Order, OptionGroup]),
    AuthModule,
    CustomersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
