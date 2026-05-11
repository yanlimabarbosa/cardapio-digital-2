import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CouponEligibilityPolicy,
  type CouponEligibilityProductInput,
} from '../../../src/modules/coupons/domain/coupon-eligibility.policy';

test('calculates eligible amount from product, flat extras, and selected options', (): void => {
  const policy = CouponEligibilityPolicy.create({}, [product()]);

  const result = policy.calculate([
    {
      productId: 'product-1',
      quantity: 2,
      extraIds: ['extra-1'],
      optionSelections: [{ groupId: 'group-1', optionIds: ['option-1'] }],
    },
  ]);

  assert.deepEqual(result, {
    eligibleAmountCents: 4500,
    eligibleQuantity: 2,
  });
});

test('applies product and category restrictions before counting eligibility', (): void => {
  const policy = CouponEligibilityPolicy.create(
    {
      applicableProductIds: ['product-2'],
      applicableCategoryIds: ['category-2'],
    },
    [product(), product({ id: 'product-2', categoryId: 'category-2', price: '12.00' })],
  );

  const result = policy.calculate([
    { productId: 'product-1', quantity: 1 },
    { productId: 'product-2', quantity: 3 },
  ]);

  assert.deepEqual(result, {
    eligibleAmountCents: 3600,
    eligibleQuantity: 3,
  });
});

test('excludes promotional products when configured', (): void => {
  const policy = CouponEligibilityPolicy.create(
    { excludePromotional: true },
    [
      product({ id: 'product-1', isPromotionActive: true, price: '10.00' }),
      product({ id: 'product-2', isPromotionActive: false, price: '15.00' }),
    ],
  );

  const result = policy.calculate([
    { productId: 'product-1', quantity: 1 },
    { productId: 'product-2', quantity: 1 },
  ]);

  assert.deepEqual(result, {
    eligibleAmountCents: 1500,
    eligibleQuantity: 1,
  });
});

function product(
  overrides: Partial<CouponEligibilityProductInput> = {},
): CouponEligibilityProductInput {
  return {
    id: overrides.id ?? 'product-1',
    categoryId: overrides.categoryId ?? 'category-1',
    price: overrides.price ?? '17.50',
    isPromotionActive: overrides.isPromotionActive ?? false,
    extras: overrides.extras ?? [{ id: 'extra-1', price: '2.50' }],
    optionGroups:
      overrides.optionGroups ??
      [
        {
          id: 'group-1',
          options: [{ id: 'option-1', price: '2.50' }],
        },
      ],
  };
}
