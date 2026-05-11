import assert from 'node:assert/strict';
import test from 'node:test';
import { ProductPricePolicy } from '../../../src/shared/domain/product-price.policy';

const activeDate: Date = new Date('2026-05-06T12:00:00-03:00');

test('uses base price when the product is not promotional', (): void => {
  const policy = ProductPricePolicy.create({
    price: '30.00',
    isPromotional: false,
    promotionalPrice: '20.00',
  });

  assert.equal(policy.isPromotionActive(activeDate), false);
  assert.equal(policy.effectivePrice(activeDate), '30.00');
});

test('uses base price when promotional price is missing', (): void => {
  const policy = ProductPricePolicy.create({
    price: '30.00',
    isPromotional: true,
  });

  assert.equal(policy.isPromotionActive(activeDate), false);
  assert.equal(policy.effectivePrice(activeDate), '30.00');
});

test('uses promotional price inside the promotion window', (): void => {
  const policy = ProductPricePolicy.create({
    price: '30.00',
    isPromotional: true,
    promotionalPrice: '20.00',
    promotionStartDate: new Date('2026-05-06T11:00:00-03:00'),
    promotionEndDate: new Date('2026-05-06T13:00:00-03:00'),
  });

  assert.equal(policy.isPromotionActive(activeDate), true);
  assert.equal(policy.effectivePrice(activeDate), '20.00');
});

test('promotion window boundaries are inclusive', (): void => {
  const policy = ProductPricePolicy.create({
    price: '30.00',
    isPromotional: true,
    promotionalPrice: '20.00',
    promotionStartDate: activeDate,
    promotionEndDate: activeDate,
  });

  assert.equal(policy.isPromotionActive(activeDate), true);
  assert.equal(policy.effectivePrice(activeDate), '20.00');
});

test('uses base price outside the promotion window', (): void => {
  const policy = ProductPricePolicy.create({
    price: '30.00',
    isPromotional: true,
    promotionalPrice: '20.00',
    promotionStartDate: new Date('2026-05-06T11:00:00-03:00'),
    promotionEndDate: new Date('2026-05-06T13:00:00-03:00'),
  });

  assert.equal(policy.isPromotionActive(new Date('2026-05-06T10:59:59-03:00')), false);
  assert.equal(policy.effectivePrice(new Date('2026-05-06T13:00:01-03:00')), '30.00');
});

test('invalid dates are rejected when evaluating pricing', (): void => {
  const policy = ProductPricePolicy.create({
    price: '30.00',
    isPromotional: true,
    promotionalPrice: '20.00',
  });

  assert.throws(
    () => policy.effectivePrice(new Date('invalid')),
    /Product pricing requires a valid date/,
  );
});
