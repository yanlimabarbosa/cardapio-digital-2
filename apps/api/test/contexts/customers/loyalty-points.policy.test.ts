import assert from 'node:assert/strict';
import test from 'node:test';
import { LoyaltyPointsPolicy } from '../../../src/shared/domain/loyalty-points.policy';

test('checks whether a customer can redeem a product cost', (): void => {
  const policy = LoyaltyPointsPolicy.forBalance(100);

  assert.equal(policy.redemptionCost(undefined), 0);
  assert.equal(policy.canRedeem(100), true);
  assert.equal(policy.canRedeem(101), false);
});

test('allows balance adjustments that do not go below zero', (): void => {
  const policy = LoyaltyPointsPolicy.forBalance(50);

  assert.deepEqual(policy.adjust(25), {
    allowed: true,
    balance: 75,
  });
  assert.deepEqual(policy.adjust(-50), {
    allowed: true,
    balance: 0,
  });
  assert.deepEqual(policy.adjust(-51), {
    allowed: false,
    reason: 'Saldo insuficiente de pontos',
  });
});

test('keeps the existing manual adjustment descriptions', (): void => {
  const policy = LoyaltyPointsPolicy.forBalance(0);

  assert.equal(policy.defaultAdjustmentDescription(1), 'Ajuste manual (credito)');
  assert.equal(policy.defaultAdjustmentDescription(0), 'Ajuste manual (debito)');
  assert.equal(policy.defaultAdjustmentDescription(-1), 'Ajuste manual (debito)');
});

test('calculates earned points from order amount excluding delivery fee', (): void => {
  const policy = LoyaltyPointsPolicy.forBalance(0);

  assert.equal(policy.pointsEarnedForOrder({ totalCents: 12345, deliveryFeeCents: 345, pointsPerReal: 2 }), 240);
  assert.equal(policy.pointsEarnedForOrder({ totalCents: 1000, deliveryFeeCents: 1000, pointsPerReal: 2 }), 0);
  assert.equal(policy.pointsEarnedForOrder({ totalCents: 1000, deliveryFeeCents: 0, pointsPerReal: 0 }), 0);
});
