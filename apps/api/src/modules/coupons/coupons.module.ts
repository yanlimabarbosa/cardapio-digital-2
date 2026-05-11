import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { Coupon, CouponUsage, Customer, Product, Order } from '../../entities';
import { MikroOrmAdminCouponReadRepository } from './adapters/persistence/mikro-orm-admin-coupon.read-repository';
import { MikroOrmAdminCouponWriteRepository } from './adapters/persistence/mikro-orm-admin-coupon-write.repository';
import { MikroOrmCouponValidationReadRepository } from './adapters/persistence/mikro-orm-coupon-validation.read-repository';
import {
  ADMIN_COUPON_READ_REPOSITORY,
  AdminCouponReadRepository,
} from './application/ports/admin-coupon.read-repository.port';
import {
  ADMIN_COUPON_WRITE_REPOSITORY,
  AdminCouponWriteRepository,
} from './application/ports/admin-coupon-write.repository.port';
import {
  COUPON_VALIDATION_READ_REPOSITORY,
  CouponValidationReadRepository,
} from './application/ports/coupon-validation.read-repository.port';
import { CreateAdminCouponUseCase } from './application/use-cases/create-admin-coupon.use-case';
import { ListAdminCouponsUseCase } from './application/use-cases/list-admin-coupons.use-case';
import { ToggleAdminCouponActiveUseCase } from './application/use-cases/toggle-admin-coupon-active.use-case';
import { UpdateAdminCouponUseCase } from './application/use-cases/update-admin-coupon.use-case';
import { ValidateCouponUseCase } from './application/use-cases/validate-coupon.use-case';
import { Clock } from '../../shared/application/clock/clock.port';
import { MikroOrmUnitOfWork } from '../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import { CouponsController, AdminCouponsController } from './coupons.controller';
import { AuthModule } from '../auth/auth.module';

const couponSystemClock: Clock = {
  now: (): Date => new Date(),
};

@Module({
  imports: [
    MikroOrmModule.forFeature([Coupon, CouponUsage, Customer, Product, Order]),
    AuthModule,
  ],
  controllers: [CouponsController, AdminCouponsController],
  providers: [
    {
      provide: ADMIN_COUPON_READ_REPOSITORY,
      useFactory: (em: EntityManager): AdminCouponReadRepository =>
        new MikroOrmAdminCouponReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ADMIN_COUPON_WRITE_REPOSITORY,
      useFactory: (): AdminCouponWriteRepository => new MikroOrmAdminCouponWriteRepository(),
    },
    {
      provide: MikroOrmUnitOfWork,
      useFactory: (em: EntityManager): MikroOrmUnitOfWork => new MikroOrmUnitOfWork(em),
      inject: [EntityManager],
    },
    {
      provide: CreateAdminCouponUseCase,
      useFactory: (
        unitOfWork: MikroOrmUnitOfWork,
        coupons: AdminCouponWriteRepository,
      ): CreateAdminCouponUseCase => new CreateAdminCouponUseCase(unitOfWork, coupons),
      inject: [MikroOrmUnitOfWork, ADMIN_COUPON_WRITE_REPOSITORY],
    },
    {
      provide: ToggleAdminCouponActiveUseCase,
      useFactory: (
        unitOfWork: MikroOrmUnitOfWork,
        coupons: AdminCouponWriteRepository,
      ): ToggleAdminCouponActiveUseCase =>
        new ToggleAdminCouponActiveUseCase(unitOfWork, coupons),
      inject: [MikroOrmUnitOfWork, ADMIN_COUPON_WRITE_REPOSITORY],
    },
    {
      provide: UpdateAdminCouponUseCase,
      useFactory: (
        unitOfWork: MikroOrmUnitOfWork,
        coupons: AdminCouponWriteRepository,
      ): UpdateAdminCouponUseCase => new UpdateAdminCouponUseCase(unitOfWork, coupons),
      inject: [MikroOrmUnitOfWork, ADMIN_COUPON_WRITE_REPOSITORY],
    },
    {
      provide: ListAdminCouponsUseCase,
      useFactory: (coupons: AdminCouponReadRepository): ListAdminCouponsUseCase =>
        new ListAdminCouponsUseCase(coupons),
      inject: [ADMIN_COUPON_READ_REPOSITORY],
    },
    {
      provide: COUPON_VALIDATION_READ_REPOSITORY,
      useFactory: (em: EntityManager): CouponValidationReadRepository =>
        new MikroOrmCouponValidationReadRepository(em),
      inject: [EntityManager],
    },
    {
      provide: ValidateCouponUseCase,
      useFactory: (coupons: CouponValidationReadRepository): ValidateCouponUseCase =>
        new ValidateCouponUseCase(coupons, couponSystemClock),
      inject: [COUPON_VALIDATION_READ_REPOSITORY],
    },
  ],
  exports: [ValidateCouponUseCase],
})
export class CouponsModule {}
