import assert from 'node:assert/strict';
import test from 'node:test';
import { CouponApplicabilityPolicy } from '../../../src/modules/coupons/domain/coupon-applicability.policy';

const mondayNoon: Date = new Date('2026-05-04T12:00:00-03:00');

test('rejects inactive coupons with the existing not found or inactive reason', (): void => {
  const policy = CouponApplicabilityPolicy.create(coupon({ isActive: false }));

  assert.deepEqual(policy.validateUse({ at: mondayNoon, deliveryType: 'pickup' }), {
    valid: false,
    reason: 'Cupom não encontrado ou inativo',
  });
});

test('validates date, weekday, and time windows', (): void => {
  const policy = CouponApplicabilityPolicy.create(coupon({
    validFrom: new Date('2026-05-04T11:00:00-03:00'),
    validUntil: new Date('2026-05-04T13:00:00-03:00'),
    validDays: [1],
    validTimeFrom: '11:00',
    validTimeTo: '13:00',
  }));

  assert.equal(policy.validateUse({ at: mondayNoon, deliveryType: 'pickup' }).valid, true);
  assert.equal(
    policy.validateUse({ at: new Date('2026-05-04T10:59:00-03:00'), deliveryType: 'pickup' }).valid,
    false,
  );
  assert.equal(
    policy.validateUse({ at: new Date('2026-05-05T12:00:00-03:00'), deliveryType: 'pickup' }).valid,
    false,
  );
});

test('validates delivery restrictions and global usage limit', (): void => {
  const deliveryOnly = CouponApplicabilityPolicy.create(coupon({
    deliveryTypeRestriction: 'delivery',
  }));
  const exhausted = CouponApplicabilityPolicy.create(coupon({
    maxUses: 2,
    currentUses: 2,
  }));

  assert.deepEqual(deliveryOnly.validateUse({ at: mondayNoon, deliveryType: 'pickup' }), {
    valid: false,
    reason: 'Cupom válido apenas para entrega',
  });
  assert.deepEqual(exhausted.validateUse({ at: mondayNoon, deliveryType: 'pickup' }), {
    valid: false,
    reason: 'Cupom atingiu o limite de usos',
  });
});

test('validates per-customer and first-order restrictions', (): void => {
  const policy = CouponApplicabilityPolicy.create(coupon({
    maxUsesPerCustomer: 1,
    firstOrderOnly: true,
  }));

  assert.deepEqual(policy.validateCustomer({ customerUsageCount: 1, customerOrderCount: 0 }), {
    valid: false,
    reason: 'Você já atingiu o limite de uso deste cupom',
  });
  assert.deepEqual(policy.validateCustomer({ customerUsageCount: 0, customerOrderCount: 1 }), {
    valid: false,
    reason: 'Cupom válido apenas para o primeiro pedido',
  });
});

test('validates eligible quantity and minimum amount', (): void => {
  const policy = CouponApplicabilityPolicy.create(coupon({
    minQuantity: 2,
    minOrderAmount: '50.00',
  }));

  assert.deepEqual(policy.validateEligibleOrder({ eligibleAmountCents: 6000, eligibleQuantity: 1 }), {
    valid: false,
    reason: 'Quantidade mínima de 2 itens elegíveis não atingida',
  });
  assert.deepEqual(policy.validateEligibleOrder({ eligibleAmountCents: 4999, eligibleQuantity: 2 }), {
    valid: false,
    reason: 'Valor mínimo de R$50.00 em itens elegíveis não atingido',
  });
});

test('calculates percentage and fixed discounts with caps', (): void => {
  const percentage = CouponApplicabilityPolicy.create(coupon({
    discountType: 'percentage',
    discountValue: '20',
    maxDiscount: '15.00',
  }));
  const fixed = CouponApplicabilityPolicy.create(coupon({
    discountType: 'fixed',
    discountValue: '50.00',
  }));

  assert.equal(percentage.calculateDiscountCents(10000), 1500);
  assert.equal(fixed.calculateDiscountCents(3000), 3000);
});

test('invalid dates are rejected when validating use', (): void => {
  const policy = CouponApplicabilityPolicy.create(coupon());

  assert.throws(
    () => policy.validateUse({ at: new Date('invalid'), deliveryType: 'pickup' }),
    /Coupon applicability requires a valid date/,
  );
});

function coupon(overrides: Partial<Parameters<typeof CouponApplicabilityPolicy.create>[0]> = {}): Parameters<typeof CouponApplicabilityPolicy.create>[0] {
  return {
    isActive: true,
    discountType: 'fixed',
    discountValue: '10.00',
    ...overrides,
  };
}
