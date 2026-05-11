import assert from 'node:assert/strict';
import test from 'node:test';
import { CouponUpdatePatch } from '../../../src/modules/coupons/domain/coupon-update-patch.value-object';

test('normalizes coupon update fields while tracking present fields', (): void => {
  const validDays = [1, 2, 3];
  const productIds = ['product-1'];
  const categoryIds = ['category-1'];
  const sectionIds = ['section-1'];

  const patch = CouponUpdatePatch.create({
    code: 'save15',
    discountType: 'fixed',
    discountValue: 15,
    maxDiscount: null,
    minOrderAmount: 50,
    minQuantity: 2,
    validFrom: null,
    validUntil: '2026-05-31T23:59:59.000Z',
    validDays,
    validTimeFrom: null,
    validTimeTo: '18:00',
    maxUses: 100,
    maxUsesPerCustomer: 2,
    firstOrderOnly: true,
    excludePromotional: true,
    deliveryTypeRestriction: null,
    applicableProductIds: productIds,
    applicableCategoryIds: categoryIds,
    applicableSectionIds: sectionIds,
    isActive: false,
  });
  validDays.push(4);
  productIds.push('product-2');
  categoryIds.push('category-2');
  sectionIds.push('section-2');

  assert.deepEqual(patch.changedFields(), [
    'code',
    'discountType',
    'discountValue',
    'maxDiscount',
    'minOrderAmount',
    'minQuantity',
    'validFrom',
    'validUntil',
    'validDays',
    'validTimeFrom',
    'validTimeTo',
    'maxUses',
    'maxUsesPerCustomer',
    'firstOrderOnly',
    'excludePromotional',
    'deliveryTypeRestriction',
    'applicableProductIds',
    'applicableCategoryIds',
    'applicableSectionIds',
    'isActive',
  ]);
  assert.equal(patch.has('maxDiscount'), true);
  assert.equal(patch.has('validFrom'), true);
  assert.deepEqual(patch.toData(), {
    code: 'SAVE15',
    discountType: 'fixed',
    discountValue: '15.00',
    maxDiscount: undefined,
    minOrderAmount: '50.00',
    minQuantity: 2,
    validFrom: undefined,
    validUntil: new Date('2026-05-31T23:59:59.000Z'),
    validDays: [1, 2, 3],
    validTimeFrom: undefined,
    validTimeTo: '18:00',
    maxUses: 100,
    maxUsesPerCustomer: 2,
    firstOrderOnly: true,
    excludePromotional: true,
    deliveryTypeRestriction: undefined,
    applicableProductIds: ['product-1'],
    applicableCategoryIds: ['category-1'],
    applicableSectionIds: ['section-1'],
    isActive: false,
  });
});

test('omits undefined coupon update fields', (): void => {
  const patch = CouponUpdatePatch.create({
    code: undefined,
    discountValue: 10,
  });

  assert.deepEqual(patch.changedFields(), ['discountValue']);
  assert.equal(patch.has('code'), false);
  assert.deepEqual(patch.toData(), {
    discountValue: '10.00',
    applicableCategoryIds: undefined,
    applicableProductIds: undefined,
    applicableSectionIds: undefined,
    validDays: undefined,
  });
});
