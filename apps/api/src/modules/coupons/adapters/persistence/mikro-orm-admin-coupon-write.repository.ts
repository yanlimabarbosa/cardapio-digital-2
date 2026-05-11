import { Coupon } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  AdminCouponWriteRepository,
  CreateAdminCouponResult,
  ToggleAdminCouponActiveResult,
  UpdateAdminCouponResult,
} from '../../application/ports/admin-coupon-write.repository.port';
import type { CouponCreationData } from '../../domain/coupon-creation-draft.value-object';
import type { CouponUpdatePatch } from '../../domain/coupon-update-patch.value-object';
import { toAdminCouponReadModel } from './admin-coupon-read-model.mapper';

export class MikroOrmAdminCouponWriteRepository implements AdminCouponWriteRepository {
  public async create(
    data: CouponCreationData,
    context: TransactionContext,
  ): Promise<CreateAdminCouponResult> {
    const em = getMikroOrmEntityManager(context);
    const existing = await em.findOne(Coupon, { code: data.code });

    if (existing) {
      return { status: 'duplicate-code' };
    }

    const coupon = em.create(Coupon, {
      code: data.code,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxDiscount: data.maxDiscount,
      minOrderAmount: data.minOrderAmount,
      minQuantity: data.minQuantity,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      validDays: data.validDays ? [...data.validDays] : undefined,
      validTimeFrom: data.validTimeFrom,
      validTimeTo: data.validTimeTo,
      maxUses: data.maxUses,
      maxUsesPerCustomer: data.maxUsesPerCustomer,
      currentUses: data.currentUses,
      firstOrderOnly: data.firstOrderOnly,
      excludePromotional: data.excludePromotional,
      deliveryTypeRestriction: data.deliveryTypeRestriction,
      applicableProductIds: data.applicableProductIds ? [...data.applicableProductIds] : undefined,
      applicableCategoryIds: data.applicableCategoryIds
        ? [...data.applicableCategoryIds]
        : undefined,
      applicableSectionIds: data.applicableSectionIds ? [...data.applicableSectionIds] : undefined,
      isActive: data.isActive,
    });

    await em.flush();

    return {
      status: 'created',
      coupon: toAdminCouponReadModel(coupon),
    };
  }

  public async toggleActive(
    id: string,
    context: TransactionContext,
  ): Promise<ToggleAdminCouponActiveResult> {
    const em = getMikroOrmEntityManager(context);
    const coupon = await em.findOne(Coupon, { id });

    if (!coupon) {
      return { status: 'not-found' };
    }

    coupon.isActive = !coupon.isActive;
    await em.flush();

    return {
      status: 'updated',
      coupon: toAdminCouponReadModel(coupon),
    };
  }

  public async update(
    id: string,
    patch: CouponUpdatePatch,
    context: TransactionContext,
  ): Promise<UpdateAdminCouponResult> {
    const em = getMikroOrmEntityManager(context);
    const coupon = await em.findOne(Coupon, { id });

    if (!coupon) {
      return { status: 'not-found' };
    }

    const data = patch.toData();

    if (patch.has('code')) {
      if (!data.code) {
        throw new Error('Coupon update code is required when code is present');
      }

      const existing = await em.findOne(Coupon, { code: data.code, id: { $ne: id } });

      if (existing) {
        return { status: 'duplicate-code' };
      }

      coupon.code = data.code;
    }

    if (patch.has('discountType')) {
      coupon.discountType = this.requirePresent(data.discountType, 'discountType');
    }

    if (patch.has('discountValue')) {
      coupon.discountValue = this.requirePresent(data.discountValue, 'discountValue');
    }

    if (patch.has('maxDiscount')) {
      coupon.maxDiscount = data.maxDiscount;
    }

    if (patch.has('minOrderAmount')) {
      coupon.minOrderAmount = this.requirePresent(data.minOrderAmount, 'minOrderAmount');
    }

    if (patch.has('minQuantity')) {
      coupon.minQuantity = this.requirePresent(data.minQuantity, 'minQuantity');
    }

    if (patch.has('validFrom')) {
      coupon.validFrom = data.validFrom;
    }

    if (patch.has('validUntil')) {
      coupon.validUntil = data.validUntil;
    }

    if (patch.has('validDays')) {
      coupon.validDays = data.validDays ? [...data.validDays] : undefined;
    }

    if (patch.has('validTimeFrom')) {
      coupon.validTimeFrom = data.validTimeFrom;
    }

    if (patch.has('validTimeTo')) {
      coupon.validTimeTo = data.validTimeTo;
    }

    if (patch.has('maxUses')) {
      coupon.maxUses = this.requirePresent(data.maxUses, 'maxUses');
    }

    if (patch.has('maxUsesPerCustomer')) {
      coupon.maxUsesPerCustomer = this.requirePresent(
        data.maxUsesPerCustomer,
        'maxUsesPerCustomer',
      );
    }

    if (patch.has('firstOrderOnly')) {
      coupon.firstOrderOnly = this.requirePresent(data.firstOrderOnly, 'firstOrderOnly');
    }

    if (patch.has('excludePromotional')) {
      coupon.excludePromotional = this.requirePresent(
        data.excludePromotional,
        'excludePromotional',
      );
    }

    if (patch.has('deliveryTypeRestriction')) {
      coupon.deliveryTypeRestriction = data.deliveryTypeRestriction;
    }

    if (patch.has('applicableProductIds')) {
      coupon.applicableProductIds = data.applicableProductIds
        ? [...data.applicableProductIds]
        : undefined;
    }

    if (patch.has('applicableCategoryIds')) {
      coupon.applicableCategoryIds = data.applicableCategoryIds
        ? [...data.applicableCategoryIds]
        : undefined;
    }

    if (patch.has('applicableSectionIds')) {
      coupon.applicableSectionIds = data.applicableSectionIds
        ? [...data.applicableSectionIds]
        : undefined;
    }

    if (patch.has('isActive')) {
      coupon.isActive = this.requirePresent(data.isActive, 'isActive');
    }

    await em.flush();

    return {
      status: 'updated',
      coupon: toAdminCouponReadModel(coupon),
    };
  }

  private requirePresent<Value>(value: Value | undefined, field: string): Value {
    if (value === undefined) {
      throw new Error(`Coupon update ${field} is required when the field is present`);
    }

    return value;
  }
}
