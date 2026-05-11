import assert from 'node:assert/strict';
import test from 'node:test';
import {
  toAdminCouponResponseDtos,
  toValidateCouponResponseDto,
} from '../../../src/modules/coupons/coupon.mapper';

test('maps coupon validation failures to the legacy response shape', (): void => {
  const result = toValidateCouponResponseDto({
    valid: false,
    reason: 'Cupom expirado',
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    valid: false,
    reason: 'Cupom expirado',
  });
});

test('maps coupon validation success to the legacy response shape', (): void => {
  const result = toValidateCouponResponseDto({
    valid: true,
    calculatedDiscount: 5,
    eligibleAmount: 50,
    coupon: {
      id: 'coupon-1',
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: '10.00',
    },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    valid: true,
    discount: 5,
    eligibleAmount: 50,
    coupon: {
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
    },
  });
});

test('maps admin coupon read models to response DTOs', (): void => {
  const result = toAdminCouponResponseDtos([
    {
      id: 'coupon-1',
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscount: 25,
      minOrderAmount: 50,
      minQuantity: 2,
      validFrom: '2026-05-01T00:00:00.000Z',
      validUntil: '2026-05-31T23:59:59.000Z',
      validDays: [1, 2, 3],
      validTimeFrom: '10:00',
      validTimeTo: '18:00',
      maxUses: 100,
      maxUsesPerCustomer: 2,
      currentUses: 7,
      firstOrderOnly: true,
      excludePromotional: true,
      deliveryTypeRestriction: 'delivery',
      applicableProductIds: ['product-1'],
      applicableCategoryIds: ['category-1'],
      applicableSectionIds: ['section-1'],
      isActive: true,
      createdAt: '2026-05-07T10:00:00.000Z',
      updatedAt: '2026-05-07T11:00:00.000Z',
    },
  ]);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    {
      id: 'coupon-1',
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscount: 25,
      minOrderAmount: 50,
      minQuantity: 2,
      validFrom: '2026-05-01T00:00:00.000Z',
      validUntil: '2026-05-31T23:59:59.000Z',
      validDays: [1, 2, 3],
      validTimeFrom: '10:00',
      validTimeTo: '18:00',
      maxUses: 100,
      maxUsesPerCustomer: 2,
      currentUses: 7,
      firstOrderOnly: true,
      excludePromotional: true,
      deliveryTypeRestriction: 'delivery',
      applicableProductIds: ['product-1'],
      applicableCategoryIds: ['category-1'],
      applicableSectionIds: ['section-1'],
      isActive: true,
      createdAt: '2026-05-07T10:00:00.000Z',
      updatedAt: '2026-05-07T11:00:00.000Z',
    },
  ]);
});
