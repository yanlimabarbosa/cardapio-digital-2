import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { Customer, Product, LoyaltyTransaction, AdminUser, Order, OrderItem } from '../../entities';
import { MikroOrmAdminCustomerReadRepository } from './adapters/persistence/mikro-orm-admin-customer.read-repository';
import { MikroOrmCustomerIdentityRepository } from './adapters/persistence/mikro-orm-customer-identity.repository';
import { MikroOrmCustomerLoyaltyAdjustmentRepository } from './adapters/persistence/mikro-orm-customer-loyalty-adjustment.repository';
import { MikroOrmCustomerLoginRepository } from './adapters/persistence/mikro-orm-customer-login.repository';
import { MikroOrmCustomerLoyaltyReadRepository } from './adapters/persistence/mikro-orm-customer-loyalty.read-repository';
import { MikroOrmCustomerOrderHistoryReadRepository } from './adapters/persistence/mikro-orm-customer-order-history.read-repository';
import { MikroOrmCustomerPasswordRepository } from './adapters/persistence/mikro-orm-customer-password.repository';
import { MikroOrmCustomerRedeemableProductsReadRepository } from './adapters/persistence/mikro-orm-customer-redeemable-products.read-repository';
import { MikroOrmCustomerRegistrationRepository } from './adapters/persistence/mikro-orm-customer-registration.repository';
import { MikroOrmCustomerTokenAuthRepository } from './adapters/persistence/mikro-orm-customer-token-auth.repository';
import {
  ADMIN_CUSTOMER_READ_REPOSITORY,
  type AdminCustomerReadRepository,
} from './application/ports/admin-customer.read-repository.port';
import {
  CUSTOMER_IDENTITY_REPOSITORY,
  type CustomerIdentityRepository,
} from './application/ports/customer-identity.repository.port';
import {
  CUSTOMER_LOGIN_REPOSITORY,
  type CustomerLoginRepository,
} from './application/ports/customer-login.repository.port';
import {
  CUSTOMER_LOYALTY_ADJUSTMENT_REPOSITORY,
  type CustomerLoyaltyAdjustmentRepository,
} from './application/ports/customer-loyalty-adjustment.repository.port';
import {
  CUSTOMER_LOYALTY_READ_REPOSITORY,
  type CustomerLoyaltyReadRepository,
} from './application/ports/customer-loyalty.read-repository.port';
import {
  CUSTOMER_ORDER_HISTORY_READ_REPOSITORY,
  type CustomerOrderHistoryReadRepository,
} from './application/ports/customer-order-history.read-repository.port';
import {
  CUSTOMER_PASSWORD_REPOSITORY,
  type CustomerPasswordRepository,
} from './application/ports/customer-password.repository.port';
import {
  CUSTOMER_REGISTRATION_REPOSITORY,
  type CustomerRegistrationRepository,
} from './application/ports/customer-registration.repository.port';
import {
  CUSTOMER_TOKEN_AUTH_REPOSITORY,
  type CustomerTokenAuthRepository,
} from './application/ports/customer-token-auth.repository.port';
import { MikroOrmCustomerProfileReadRepository } from './adapters/persistence/mikro-orm-customer-profile.read-repository';
import {
  CUSTOMER_PROFILE_READ_REPOSITORY,
  type CustomerProfileReadRepository,
} from './application/ports/customer-profile.read-repository.port';
import {
  CUSTOMER_REDEEMABLE_PRODUCTS_READ_REPOSITORY,
  type CustomerRedeemableProductsReadRepository,
} from './application/ports/customer-redeemable-products.read-repository.port';
import { AdjustCustomerLoyaltyUseCase } from './application/use-cases/adjust-customer-loyalty.use-case';
import { AuthenticateCustomerTokenUseCase } from './application/use-cases/authenticate-customer-token.use-case';
import { GetCustomerLoyaltyUseCase } from './application/use-cases/get-customer-loyalty.use-case';
import { GetCustomerOrderHistoryUseCase } from './application/use-cases/get-customer-order-history.use-case';
import { GetCustomerProfileUseCase } from './application/use-cases/get-customer-profile.use-case';
import { GetCustomerRedeemableProductsUseCase } from './application/use-cases/get-customer-redeemable-products.use-case';
import { IdentifyCustomerUseCase } from './application/use-cases/identify-customer.use-case';
import { ListAdminCustomersUseCase } from './application/use-cases/list-admin-customers.use-case';
import { LoginCustomerUseCase } from './application/use-cases/login-customer.use-case';
import { RegisterCustomerUseCase } from './application/use-cases/register-customer.use-case';
import { SetCustomerPasswordUseCase } from './application/use-cases/set-customer-password.use-case';
import { MikroOrmUnitOfWork } from '../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import { CustomersController } from './customers.controller';
import { CustomerTokenGuard } from './customer-token.guard';

@Module({
  imports: [MikroOrmModule.forFeature([Customer, Product, LoyaltyTransaction, AdminUser, Order, OrderItem])],
  controllers: [CustomersController],
  providers: [
    CustomerTokenGuard,
    {
      provide: CUSTOMER_IDENTITY_REPOSITORY,
      useFactory: (): CustomerIdentityRepository => new MikroOrmCustomerIdentityRepository(),
    },
    {
      provide: CUSTOMER_LOGIN_REPOSITORY,
      useFactory: (): CustomerLoginRepository => new MikroOrmCustomerLoginRepository(),
    },
    {
      provide: CUSTOMER_PASSWORD_REPOSITORY,
      useFactory: (): CustomerPasswordRepository => new MikroOrmCustomerPasswordRepository(),
    },
    {
      provide: CUSTOMER_REGISTRATION_REPOSITORY,
      useFactory: (): CustomerRegistrationRepository => new MikroOrmCustomerRegistrationRepository(),
    },
    {
      provide: CUSTOMER_TOKEN_AUTH_REPOSITORY,
      useFactory: (em: EntityManager): CustomerTokenAuthRepository =>
        new MikroOrmCustomerTokenAuthRepository(em),
      inject: [EntityManager],
    },
    {
      provide: AuthenticateCustomerTokenUseCase,
      useFactory: (
        customers: CustomerTokenAuthRepository,
      ): AuthenticateCustomerTokenUseCase => new AuthenticateCustomerTokenUseCase(customers),
      inject: [CUSTOMER_TOKEN_AUTH_REPOSITORY],
    },
    {
      provide: ADMIN_CUSTOMER_READ_REPOSITORY,
      useFactory: (em: EntityManager): AdminCustomerReadRepository =>
        new MikroOrmAdminCustomerReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ListAdminCustomersUseCase,
      useFactory: (customers: AdminCustomerReadRepository): ListAdminCustomersUseCase =>
        new ListAdminCustomersUseCase(customers),
      inject: [ADMIN_CUSTOMER_READ_REPOSITORY],
    },
    {
      provide: CUSTOMER_PROFILE_READ_REPOSITORY,
      useFactory: (em: EntityManager): CustomerProfileReadRepository =>
        new MikroOrmCustomerProfileReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: CUSTOMER_LOYALTY_READ_REPOSITORY,
      useFactory: (em: EntityManager): CustomerLoyaltyReadRepository =>
        new MikroOrmCustomerLoyaltyReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: CUSTOMER_LOYALTY_ADJUSTMENT_REPOSITORY,
      useFactory: (): CustomerLoyaltyAdjustmentRepository =>
        new MikroOrmCustomerLoyaltyAdjustmentRepository(),
    },
    {
      provide: AdjustCustomerLoyaltyUseCase,
      useFactory: (
        loyalty: CustomerLoyaltyAdjustmentRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): AdjustCustomerLoyaltyUseCase =>
        new AdjustCustomerLoyaltyUseCase(loyalty, unitOfWork),
      inject: [CUSTOMER_LOYALTY_ADJUSTMENT_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: GetCustomerLoyaltyUseCase,
      useFactory: (loyalty: CustomerLoyaltyReadRepository): GetCustomerLoyaltyUseCase =>
        new GetCustomerLoyaltyUseCase(loyalty),
      inject: [CUSTOMER_LOYALTY_READ_REPOSITORY],
    },
    {
      provide: CUSTOMER_ORDER_HISTORY_READ_REPOSITORY,
      useFactory: (em: EntityManager): CustomerOrderHistoryReadRepository =>
        new MikroOrmCustomerOrderHistoryReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: GetCustomerOrderHistoryUseCase,
      useFactory: (orders: CustomerOrderHistoryReadRepository): GetCustomerOrderHistoryUseCase =>
        new GetCustomerOrderHistoryUseCase(orders),
      inject: [CUSTOMER_ORDER_HISTORY_READ_REPOSITORY],
    },
    {
      provide: CUSTOMER_REDEEMABLE_PRODUCTS_READ_REPOSITORY,
      useFactory: (em: EntityManager): CustomerRedeemableProductsReadRepository =>
        new MikroOrmCustomerRedeemableProductsReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: GetCustomerRedeemableProductsUseCase,
      useFactory: (
        products: CustomerRedeemableProductsReadRepository,
      ): GetCustomerRedeemableProductsUseCase =>
        new GetCustomerRedeemableProductsUseCase(products),
      inject: [CUSTOMER_REDEEMABLE_PRODUCTS_READ_REPOSITORY],
    },
    {
      provide: GetCustomerProfileUseCase,
      useFactory: (profiles: CustomerProfileReadRepository): GetCustomerProfileUseCase =>
        new GetCustomerProfileUseCase(profiles),
      inject: [CUSTOMER_PROFILE_READ_REPOSITORY],
    },
    {
      provide: MikroOrmUnitOfWork,
      useFactory: (em: EntityManager): MikroOrmUnitOfWork => new MikroOrmUnitOfWork(em),
      inject: [EntityManager],
    },
    {
      provide: IdentifyCustomerUseCase,
      useFactory: (
        customers: CustomerIdentityRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): IdentifyCustomerUseCase => new IdentifyCustomerUseCase(customers, unitOfWork),
      inject: [CUSTOMER_IDENTITY_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: RegisterCustomerUseCase,
      useFactory: (
        customers: CustomerRegistrationRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): RegisterCustomerUseCase => new RegisterCustomerUseCase(customers, unitOfWork),
      inject: [CUSTOMER_REGISTRATION_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: LoginCustomerUseCase,
      useFactory: (
        customers: CustomerLoginRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): LoginCustomerUseCase => new LoginCustomerUseCase(customers, unitOfWork),
      inject: [CUSTOMER_LOGIN_REPOSITORY, MikroOrmUnitOfWork],
    },
    {
      provide: SetCustomerPasswordUseCase,
      useFactory: (
        customers: CustomerPasswordRepository,
        unitOfWork: MikroOrmUnitOfWork,
      ): SetCustomerPasswordUseCase => new SetCustomerPasswordUseCase(customers, unitOfWork),
      inject: [CUSTOMER_PASSWORD_REPOSITORY, MikroOrmUnitOfWork],
    },
  ],
  exports: [
    AdjustCustomerLoyaltyUseCase,
    AuthenticateCustomerTokenUseCase,
    CustomerTokenGuard,
    GetCustomerLoyaltyUseCase,
    GetCustomerOrderHistoryUseCase,
    GetCustomerProfileUseCase,
    GetCustomerRedeemableProductsUseCase,
    IdentifyCustomerUseCase,
    ListAdminCustomersUseCase,
    LoginCustomerUseCase,
    RegisterCustomerUseCase,
    SetCustomerPasswordUseCase,
  ],
})
export class CustomersModule {}
