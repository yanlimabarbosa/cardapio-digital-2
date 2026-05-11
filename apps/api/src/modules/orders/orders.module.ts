import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { Order, OrderItem, Product, ProductExtra, Customer, LoyaltyTransaction, StoreSettings } from '../../entities';
import { OrdersController } from './orders.controller';
import { AuthModule } from '../auth/auth.module';
import { CouponsModule } from '../coupons/coupons.module';
import { ValidateCouponUseCase } from '../coupons/application/use-cases/validate-coupon.use-case';
import { GetStoreStatusUseCase } from '../store/application/use-cases/get-store-status.use-case';
import { ChangeOrderStatusUseCase } from './application/use-cases/change-order-status.use-case';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetKitchenOrdersUseCase } from './application/use-cases/get-kitchen-orders.use-case';
import { GetOrderDetailsUseCase } from './application/use-cases/get-order-details.use-case';
import { Clock } from '../../shared/application/clock/clock.port';
import { ORDER_COUPON_USAGE_REPOSITORY, OrderCouponUsageRepository } from './application/ports/order-coupon-usage.port';
import { ORDER_COUPON_VALIDATOR, OrderCouponValidator } from './application/ports/order-coupon.port';
import { ORDER_CREATION_REPORTER, OrderCreationReporter } from './application/ports/order-creation-reporter.port';
import { ORDER_CREATION_REPOSITORY, OrderCreationRepository } from './application/ports/order-creation.repository.port';
import { ORDER_CUSTOMER_REPOSITORY, OrderCustomerRepository } from './application/ports/order-customer.port';
import { ORDER_DELIVERY_AREA_REPOSITORY, OrderDeliveryAreaRepository } from './application/ports/order-delivery-area.port';
import { ORDER_LOYALTY_REDEMPTION_REPOSITORY, OrderLoyaltyRedemptionRepository } from './application/ports/order-loyalty-redemption.port';
import { ORDER_PRODUCT_CATALOG_REPOSITORY, OrderProductCatalogRepository } from './application/ports/order-product-catalog.port';
import { ORDER_SEQUENCE_REPOSITORY, OrderSequenceRepository } from './application/ports/order-sequence.port';
import { ORDER_STORE_AVAILABILITY_CHECKER, OrderStoreAvailabilityChecker } from './application/ports/order-store-availability.port';
import { ValidateCouponUseCaseOrderCouponValidator } from './adapters/coupons/validate-coupon-use-case-order-coupon.validator';
import { NestOrderCreationReporter } from './adapters/logging/nest-order-creation.reporter';
import { MikroOrmOrderCreationRepository } from './adapters/persistence/mikro-orm-order-creation.repository';
import { MikroOrmOrderCouponUsageRepository } from './adapters/persistence/mikro-orm-order-coupon-usage.repository';
import { MikroOrmOrderCustomerRepository } from './adapters/persistence/mikro-orm-order-customer.repository';
import { MikroOrmOrderDeliveryAreaRepository } from './adapters/persistence/mikro-orm-order-delivery-area.repository';
import { MikroOrmOrderLoyaltyRedemptionRepository } from './adapters/persistence/mikro-orm-order-loyalty-redemption.repository';
import { MikroOrmOrderProductCatalogRepository } from './adapters/persistence/mikro-orm-order-product-catalog.repository';
import { MikroOrmOrderReadRepository } from './adapters/persistence/mikro-orm-order.read-repository';
import { MikroOrmOrderSequenceRepository } from './adapters/persistence/mikro-orm-order-sequence.repository';
import { MikroOrmOrderStatusRepository } from './adapters/persistence/mikro-orm-order-status.repository';
import { SocketIoOrderRealtimeNotifier } from './adapters/realtime/socket-io-order-realtime.notifier';
import { GetStoreStatusUseCaseOrderStoreAvailabilityChecker } from './adapters/store/get-store-status-use-case-order-store-availability.checker';
import { MikroOrmUnitOfWork } from '../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import { KitchenGateway } from '../websocket/websocket.gateway';

const orderSystemClock: Clock = {
  now: (): Date => new Date(),
};

@Module({
  imports: [
    MikroOrmModule.forFeature([Order, OrderItem, Product, ProductExtra, Customer, LoyaltyTransaction, StoreSettings]),
    AuthModule,
    CouponsModule,
  ],
  controllers: [OrdersController],
  providers: [
    {
      provide: MikroOrmOrderReadRepository,
      useFactory: (em: EntityManager): MikroOrmOrderReadRepository => new MikroOrmOrderReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: MikroOrmOrderStatusRepository,
      useFactory: (): MikroOrmOrderStatusRepository => new MikroOrmOrderStatusRepository(),
    },
    {
      provide: ORDER_STORE_AVAILABILITY_CHECKER,
      useFactory: (
        getStoreStatusUseCase: GetStoreStatusUseCase,
      ): GetStoreStatusUseCaseOrderStoreAvailabilityChecker =>
        new GetStoreStatusUseCaseOrderStoreAvailabilityChecker(getStoreStatusUseCase),
      inject: [GetStoreStatusUseCase],
    },
    {
      provide: ORDER_PRODUCT_CATALOG_REPOSITORY,
      useFactory: (em: EntityManager): MikroOrmOrderProductCatalogRepository =>
        new MikroOrmOrderProductCatalogRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ORDER_SEQUENCE_REPOSITORY,
      useFactory: (em: EntityManager): MikroOrmOrderSequenceRepository =>
        new MikroOrmOrderSequenceRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ORDER_DELIVERY_AREA_REPOSITORY,
      useFactory: (em: EntityManager): MikroOrmOrderDeliveryAreaRepository =>
        new MikroOrmOrderDeliveryAreaRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ORDER_CUSTOMER_REPOSITORY,
      useFactory: (em: EntityManager): MikroOrmOrderCustomerRepository =>
        new MikroOrmOrderCustomerRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ORDER_CREATION_REPOSITORY,
      useFactory: (em: EntityManager): MikroOrmOrderCreationRepository =>
        new MikroOrmOrderCreationRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ORDER_COUPON_VALIDATOR,
      useFactory: (
        validateCouponUseCase: ValidateCouponUseCase,
      ): ValidateCouponUseCaseOrderCouponValidator =>
        new ValidateCouponUseCaseOrderCouponValidator(validateCouponUseCase),
      inject: [ValidateCouponUseCase],
    },
    {
      provide: ORDER_COUPON_USAGE_REPOSITORY,
      useFactory: (em: EntityManager): MikroOrmOrderCouponUsageRepository =>
        new MikroOrmOrderCouponUsageRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ORDER_LOYALTY_REDEMPTION_REPOSITORY,
      useFactory: (em: EntityManager): MikroOrmOrderLoyaltyRedemptionRepository =>
        new MikroOrmOrderLoyaltyRedemptionRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ORDER_CREATION_REPORTER,
      useFactory: (): NestOrderCreationReporter => new NestOrderCreationReporter(),
    },
    {
      provide: MikroOrmUnitOfWork,
      useFactory: (em: EntityManager): MikroOrmUnitOfWork => new MikroOrmUnitOfWork(em),
      inject: [EntityManager],
    },
    {
      provide: SocketIoOrderRealtimeNotifier,
      useFactory: (kitchenGateway: KitchenGateway): SocketIoOrderRealtimeNotifier =>
        new SocketIoOrderRealtimeNotifier(kitchenGateway),
      inject: [KitchenGateway],
    },
    {
      provide: CreateOrderUseCase,
      useFactory: (
        unitOfWork: MikroOrmUnitOfWork,
        orderStoreAvailabilityChecker: OrderStoreAvailabilityChecker,
        productCatalogRepository: OrderProductCatalogRepository,
        orderSequenceRepository: OrderSequenceRepository,
        orderDeliveryAreaRepository: OrderDeliveryAreaRepository,
        orderCustomerRepository: OrderCustomerRepository,
        orderCreationRepository: OrderCreationRepository,
        orderCouponValidator: OrderCouponValidator,
        orderCouponUsageRepository: OrderCouponUsageRepository,
        orderLoyaltyRedemptionRepository: OrderLoyaltyRedemptionRepository,
        orderCreationReporter: OrderCreationReporter,
      ): CreateOrderUseCase =>
        new CreateOrderUseCase(
          unitOfWork,
          orderSystemClock,
          orderStoreAvailabilityChecker,
          productCatalogRepository,
          orderSequenceRepository,
          orderDeliveryAreaRepository,
          orderCustomerRepository,
          orderCreationRepository,
          orderCouponValidator,
          orderCouponUsageRepository,
          orderLoyaltyRedemptionRepository,
          orderCreationReporter,
        ),
      inject: [
        MikroOrmUnitOfWork,
        ORDER_STORE_AVAILABILITY_CHECKER,
        ORDER_PRODUCT_CATALOG_REPOSITORY,
        ORDER_SEQUENCE_REPOSITORY,
        ORDER_DELIVERY_AREA_REPOSITORY,
        ORDER_CUSTOMER_REPOSITORY,
        ORDER_CREATION_REPOSITORY,
        ORDER_COUPON_VALIDATOR,
        ORDER_COUPON_USAGE_REPOSITORY,
        ORDER_LOYALTY_REDEMPTION_REPOSITORY,
        ORDER_CREATION_REPORTER,
      ],
    },
    {
      provide: GetKitchenOrdersUseCase,
      useFactory: (orderReadRepository: MikroOrmOrderReadRepository): GetKitchenOrdersUseCase =>
        new GetKitchenOrdersUseCase(orderReadRepository),
      inject: [MikroOrmOrderReadRepository],
    },
    {
      provide: GetOrderDetailsUseCase,
      useFactory: (orderReadRepository: MikroOrmOrderReadRepository): GetOrderDetailsUseCase =>
        new GetOrderDetailsUseCase(orderReadRepository),
      inject: [MikroOrmOrderReadRepository],
    },
    {
      provide: ChangeOrderStatusUseCase,
      useFactory: (
        unitOfWork: MikroOrmUnitOfWork,
        orderStatusRepository: MikroOrmOrderStatusRepository,
        realtimeNotifier: SocketIoOrderRealtimeNotifier,
      ): ChangeOrderStatusUseCase =>
        new ChangeOrderStatusUseCase(unitOfWork, orderStatusRepository, realtimeNotifier),
      inject: [MikroOrmUnitOfWork, MikroOrmOrderStatusRepository, SocketIoOrderRealtimeNotifier],
    },
  ],
  exports: [
    CreateOrderUseCase,
    GetKitchenOrdersUseCase,
    GetOrderDetailsUseCase,
    ChangeOrderStatusUseCase,
  ],
})
export class OrdersModule {}
