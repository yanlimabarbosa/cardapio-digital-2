import assert from 'node:assert/strict';
import test from 'node:test';
import { PaymentStatusPolicy } from '../../../src/modules/payments/domain/payment-status.policy';

test('maps gateway charge statuses to local payment statuses', (): void => {
  const policy = PaymentStatusPolicy.create();

  assert.equal(policy.fromGatewayChargeStatus('PAID'), 'approved');
  assert.equal(policy.fromGatewayChargeStatus('DECLINED'), 'rejected');
  assert.equal(policy.fromGatewayChargeStatus('CANCELED'), 'rejected');
  assert.equal(policy.fromGatewayChargeStatus('CANCELLED'), 'rejected');
  assert.equal(policy.fromGatewayChargeStatus('REFUNDED'), 'refunded');
  assert.equal(policy.fromGatewayChargeStatus('WAITING'), 'pending');
  assert.equal(policy.fromGatewayChargeStatus(undefined), undefined);
});

test('uses gateway order status priority from current payment behavior', (): void => {
  const policy = PaymentStatusPolicy.create();

  assert.equal(policy.fromGatewayChargeStatuses(['WAITING', 'PAID']), 'approved');
  assert.equal(policy.fromGatewayChargeStatuses(['WAITING', 'DECLINED']), 'rejected');
  assert.equal(policy.fromGatewayChargeStatuses(['WAITING', 'REFUNDED']), 'refunded');
  assert.equal(policy.fromGatewayChargeStatuses(['WAITING', undefined]), 'pending');
  assert.equal(policy.fromGatewayChargeStatuses([]), 'pending');
});
