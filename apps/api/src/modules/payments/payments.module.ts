import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../entities';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './webhook.controller';
import { PaymentProcessor } from './payment.processor';
import { WebsocketModule } from '../websocket/websocket.module';
import { KitchenGateway } from '../websocket/websocket.gateway';
import { PAYMENT_QUEUE } from './payment.constants';
import { ConfigPaymentWebhookSettings } from './adapters/config/config-payment-webhook.settings';
import { NestPaymentStatusSyncReporter } from './adapters/logging/nest-payment-status-sync.reporter';
import { PagBankPaymentGateway } from './adapters/pagbank/pagbank-payment.gateway';
import { PagBankWebhookJobFactory } from './adapters/pagbank/pagbank-webhook-job.factory';
import { PagBankWebhookSignatureVerifier } from './adapters/pagbank/pagbank-webhook-signature.verifier';
import { MikroOrmPaymentOrderRepository } from './adapters/persistence/mikro-orm-payment-order.repository';
import {
  BullMqPaymentWebhookQueue,
  type BullMqPaymentWebhookAddQueue,
} from './adapters/queue/bullmq-payment-webhook.queue';
import { SocketIoPaymentRealtimeNotifier } from './adapters/realtime/socket-io-payment-realtime.notifier';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from './application/ports/payment-gateway.port';
import {
  PAYMENT_ORDER_REPOSITORY,
  type PaymentOrderRepository,
} from './application/ports/payment-order.port';
import {
  PAYMENT_REALTIME_NOTIFIER,
  type PaymentRealtimeNotifier,
} from './application/ports/payment-realtime-notifier.port';
import {
  PAYMENT_STATUS_SYNC_REPORTER,
  type PaymentStatusSyncReporter,
} from './application/ports/payment-status-sync-reporter.port';
import {
  PAYMENT_WEBHOOK_JOB_FACTORY,
  type PaymentWebhookJobFactory,
} from './application/ports/payment-webhook-job-factory.port';
import {
  PAYMENT_WEBHOOK_QUEUE,
  type PaymentWebhookQueue,
} from './application/ports/payment-webhook-queue.port';
import {
  PAYMENT_WEBHOOK_SETTINGS,
  type PaymentWebhookSettings,
} from './application/ports/payment-webhook-settings.port';
import {
  PAYMENT_WEBHOOK_SIGNATURE_VERIFIER,
  type PaymentWebhookSignatureVerifier,
} from './application/ports/payment-webhook-signature-verifier.port';
import { CreateCardPaymentUseCase } from './application/use-cases/create-card-payment.use-case';
import { CreateDebitCardPaymentUseCase } from './application/use-cases/create-debit-card-payment.use-case';
import { CreatePayment3dsSessionUseCase } from './application/use-cases/create-payment-3ds-session.use-case';
import { CreatePixPaymentUseCase } from './application/use-cases/create-pix-payment.use-case';
import { GetPaymentStatusUseCase } from './application/use-cases/get-payment-status.use-case';
import { HandlePagBankWebhookUseCase } from './application/use-cases/handle-pagbank-webhook.use-case';

@Module({
  imports: [
    MikroOrmModule.forFeature([Order]),
    BullModule.registerQueue({ name: PAYMENT_QUEUE }),
    WebsocketModule,
  ],
  controllers: [PaymentsController, WebhookController],
  providers: [
    {
      provide: PAYMENT_ORDER_REPOSITORY,
      useFactory: (em: EntityManager): PaymentOrderRepository => new MikroOrmPaymentOrderRepository(em),
      inject: [EntityManager],
    },
    {
      provide: PAYMENT_REALTIME_NOTIFIER,
      useFactory: (kitchenGateway: KitchenGateway): PaymentRealtimeNotifier =>
        new SocketIoPaymentRealtimeNotifier(kitchenGateway),
      inject: [KitchenGateway],
    },
    {
      provide: PAYMENT_STATUS_SYNC_REPORTER,
      useFactory: (): PaymentStatusSyncReporter => new NestPaymentStatusSyncReporter(),
    },
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (configService: ConfigService): PaymentGateway => new PagBankPaymentGateway(configService),
      inject: [ConfigService],
    },
    {
      provide: PAYMENT_WEBHOOK_SETTINGS,
      useFactory: (configService: ConfigService): PaymentWebhookSettings =>
        new ConfigPaymentWebhookSettings(configService),
      inject: [ConfigService],
    },
    {
      provide: PAYMENT_WEBHOOK_SIGNATURE_VERIFIER,
      useFactory: (): PaymentWebhookSignatureVerifier => new PagBankWebhookSignatureVerifier(),
    },
    {
      provide: PAYMENT_WEBHOOK_JOB_FACTORY,
      useFactory: (): PaymentWebhookJobFactory => new PagBankWebhookJobFactory(),
    },
    {
      provide: PAYMENT_WEBHOOK_QUEUE,
      useFactory: (paymentQueue: BullMqPaymentWebhookAddQueue): PaymentWebhookQueue =>
        new BullMqPaymentWebhookQueue(paymentQueue),
      inject: [getQueueToken(PAYMENT_QUEUE)],
    },
    PaymentProcessor,
    {
      provide: CreatePixPaymentUseCase,
      useFactory: (
        paymentOrders: PaymentOrderRepository,
        paymentGateway: PaymentGateway,
      ): CreatePixPaymentUseCase => new CreatePixPaymentUseCase(paymentOrders, paymentGateway),
      inject: [PAYMENT_ORDER_REPOSITORY, PAYMENT_GATEWAY],
    },
    {
      provide: CreateCardPaymentUseCase,
      useFactory: (
        paymentOrders: PaymentOrderRepository,
        paymentGateway: PaymentGateway,
        paymentRealtimeNotifier: PaymentRealtimeNotifier,
      ): CreateCardPaymentUseCase =>
        new CreateCardPaymentUseCase(paymentOrders, paymentGateway, paymentRealtimeNotifier),
      inject: [PAYMENT_ORDER_REPOSITORY, PAYMENT_GATEWAY, PAYMENT_REALTIME_NOTIFIER],
    },
    {
      provide: CreatePayment3dsSessionUseCase,
      useFactory: (paymentGateway: PaymentGateway): CreatePayment3dsSessionUseCase =>
        new CreatePayment3dsSessionUseCase(paymentGateway),
      inject: [PAYMENT_GATEWAY],
    },
    {
      provide: CreateDebitCardPaymentUseCase,
      useFactory: (
        paymentOrders: PaymentOrderRepository,
        paymentGateway: PaymentGateway,
        paymentRealtimeNotifier: PaymentRealtimeNotifier,
      ): CreateDebitCardPaymentUseCase =>
        new CreateDebitCardPaymentUseCase(paymentOrders, paymentGateway, paymentRealtimeNotifier),
      inject: [PAYMENT_ORDER_REPOSITORY, PAYMENT_GATEWAY, PAYMENT_REALTIME_NOTIFIER],
    },
    {
      provide: GetPaymentStatusUseCase,
      useFactory: (
        paymentOrders: PaymentOrderRepository,
        paymentGateway: PaymentGateway,
        paymentRealtimeNotifier: PaymentRealtimeNotifier,
        paymentStatusSyncReporter: PaymentStatusSyncReporter,
      ): GetPaymentStatusUseCase =>
        new GetPaymentStatusUseCase(
          paymentOrders,
          paymentGateway,
          paymentRealtimeNotifier,
          paymentStatusSyncReporter,
        ),
      inject: [
        PAYMENT_ORDER_REPOSITORY,
        PAYMENT_GATEWAY,
        PAYMENT_REALTIME_NOTIFIER,
        PAYMENT_STATUS_SYNC_REPORTER,
      ],
    },
    {
      provide: HandlePagBankWebhookUseCase,
      useFactory: (
        settings: PaymentWebhookSettings,
        signatureVerifier: PaymentWebhookSignatureVerifier,
        jobFactory: PaymentWebhookJobFactory,
        queue: PaymentWebhookQueue,
      ): HandlePagBankWebhookUseCase =>
        new HandlePagBankWebhookUseCase(
          settings,
          signatureVerifier,
          jobFactory,
          queue,
        ),
      inject: [
        PAYMENT_WEBHOOK_SETTINGS,
        PAYMENT_WEBHOOK_SIGNATURE_VERIFIER,
        PAYMENT_WEBHOOK_JOB_FACTORY,
        PAYMENT_WEBHOOK_QUEUE,
      ],
    },
  ],
  exports: [
    CreatePixPaymentUseCase,
    CreateCardPaymentUseCase,
    CreatePayment3dsSessionUseCase,
    CreateDebitCardPaymentUseCase,
    GetPaymentStatusUseCase,
    HandlePagBankWebhookUseCase,
  ],
})
export class PaymentsModule {}
