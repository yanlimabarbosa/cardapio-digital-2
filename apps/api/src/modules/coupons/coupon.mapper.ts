import type { AdminCouponReadModel } from './application/read-models/admin-coupon.read-model';
import type { ValidateCouponResult } from './application/use-cases/validate-coupon.use-case';
import { AdminCouponResponseDto } from './dto/response/admin-coupon-response.dto';
import {
  ValidateCouponResponseCouponDto,
  ValidateCouponResponseDto,
} from './dto/response/validate-coupon-response.dto';

export function toAdminCouponResponseDtos(
  coupons: readonly AdminCouponReadModel[],
): AdminCouponResponseDto[] {
  return coupons.map((coupon) => toAdminCouponResponseDto(coupon));
}

export function toAdminCouponResponseDto(coupon: AdminCouponReadModel): AdminCouponResponseDto {
  return new AdminCouponResponseDto(
    coupon.id,
    coupon.code,
    coupon.discountType,
    coupon.discountValue,
    coupon.maxDiscount,
    coupon.minOrderAmount,
    coupon.minQuantity,
    coupon.validFrom,
    coupon.validUntil,
    coupon.validDays ? [...coupon.validDays] : null,
    coupon.validTimeFrom,
    coupon.validTimeTo,
    coupon.maxUses,
    coupon.maxUsesPerCustomer,
    coupon.currentUses,
    coupon.firstOrderOnly,
    coupon.excludePromotional,
    coupon.deliveryTypeRestriction,
    coupon.applicableProductIds ? [...coupon.applicableProductIds] : null,
    coupon.applicableCategoryIds ? [...coupon.applicableCategoryIds] : null,
    coupon.applicableSectionIds ? [...coupon.applicableSectionIds] : null,
    coupon.isActive,
    coupon.createdAt,
    coupon.updatedAt,
  );
}

export function toValidateCouponResponseDto(
  result: ValidateCouponResult,
): ValidateCouponResponseDto {
  if (!result.valid) {
    return new ValidateCouponResponseDto(false, result.reason);
  }

  return new ValidateCouponResponseDto(
    true,
    undefined,
    result.calculatedDiscount,
    result.eligibleAmount,
    new ValidateCouponResponseCouponDto(
      result.coupon.code,
      result.coupon.discountType,
      parseFloat(result.coupon.discountValue),
    ),
  );
}
