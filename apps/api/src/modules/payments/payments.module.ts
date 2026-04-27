import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Order } from '../../entities';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhookController } from './webhook.controller';
import { PaymentProcessor } from './payment.processor';
import { OrdersModule } from '../orders/orders.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { PAYMENT_QUEUE } from './payment.constants';

@Module({
  imports: [
    MikroOrmModule.forFeature([Order]),
    BullModule.registerQueue({ name: PAYMENT_QUEUE }),
    OrdersModule,
    WebsocketModule,
  ],
  controllers: [PaymentsController, WebhookController],
  providers: [PaymentsService, PaymentProcessor],
})
export class PaymentsModule {}
