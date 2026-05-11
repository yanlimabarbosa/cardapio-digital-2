import assert from 'node:assert/strict';
import test from 'node:test';
import { CouponCreationDraft } from '../../../src/modules/coupons/domain/coupon-creation-draft.value-object';

test('normalizes coupon creation data with legacy defaults and formatting', (): void => {
  const validDays = [1, 2, 3];
  const productIds = ['product-1'];
  const categoryIds = ['category-1'];
  const sectionIds = ['section-1'];

  const draft = CouponCreationDraft.create({
    code: 'save10',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: 25,
    minOrderAmount: 50,
    minQuantity: 2,
    validFrom: '2026-05-01T00:00:00.000Z',
    validUntil: '2026-05-31T23:59:59.000Z',
    validDays,
    validTimeFrom: '10:00',
    validTimeTo: '18:00',
    maxUses: 100,
    maxUsesPerCustomer: 2,
    firstOrderOnly: true,
    excludePromotional: true,
    deliveryTypeRestriction: 'delivery',
    applicableProductIds: productIds,
    applicableCategoryIds: categoryIds,
    applicableSectionIds: sectionIds,
    isActive: false,
  });
  validDays.push(4);
  productIds.push('product-2');
  categoryIds.push('category-2');
  sectionIds.push('section-2');

  const result = draft.toData();

  assert.deepEqual(result, {
    code: 'SAVE10',
    discountType: 'percentage',
    discountValue: '10.00',
    maxDiscount: '25.00',
    minOrderAmount: '50.00',
    minQuantity: 2,
    validFrom: new Date('2026-05-01T00:00:00.000Z'),
    validUntil: new Date('2026-05-31T23:59:59.000Z'),
    validDays: [1, 2, 3],
    validTimeFrom: '10:00',
    validTimeTo: '18:00',
    maxUses: 100,
    maxUsesPerCustomer: 2,
    currentUses: 0,
    firstOrderOnly: true,
    excludePromotional: true,
    deliveryTypeRestriction: 'delivery',
    applicableProductIds: ['product-1'],
    applicableCategoryIds: ['category-1'],
    applicableSectionIds: ['section-1'],
    isActive: false,
  });
});

test('uses legacy coupon creation defaults when optional fields are omitted', (): void => {
  const draft = CouponCreationDraft.create({
    code: 'fixed5',
    discountType: 'fixed',
    discountValue: 5,
  });

  assert.deepEqual(draft.toData(), {
    code: 'FIXED5',
    discountType: 'fixed',
    discountValue: '5.00',
    maxDiscount: undefined,
    minOrderAmount: '0',
    minQuantity: 0,
    validFrom: undefined,
    validUntil: undefined,
    validDays: undefined,
    validTimeFrom: undefined,
    validTimeTo: undefined,
    maxUses: 0,
    maxUsesPerCustomer: 0,
    currentUses: 0,
    firstOrderOnly: false,
    excludePromotional: false,
    deliveryTypeRestriction: undefined,
    applicableProductIds: undefined,
    applicableCategoryIds: undefined,
    applicableSectionIds: undefined,
    isActive: true,
  });
});
