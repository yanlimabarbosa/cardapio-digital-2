import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BullModule } from '@nestjs/bullmq';
import mikroOrmConfig from './config/mikro-orm.config';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { StoreModule } from './modules/store/store.module';
import { DeliveryAreasModule } from './modules/delivery-areas/delivery-areas.module';
import { SectionsModule } from './modules/sections/sections.module';
import { CustomersModule } from './modules/customers/customers.module';
import { CouponsModule } from './modules/coupons/coupons.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    ProductsModule,
    OrdersModule,
    WebsocketModule,
    AuthModule,
    AdminModule,
    StoreModule,
    DeliveryAreasModule,
    SectionsModule,
    CustomersModule,
    CouponsModule,
  ],
})
export class AppModule {}
