import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus } from '@cardapio/shared';
import { OrderStatusTransitionPolicy } from '../../../src/modules/orders/domain/order-status.policy';

const expectedTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

test('lists the allowed order status transitions', (): void => {
  for (const status of Object.values(OrderStatus)) {
    assert.deepEqual(
      OrderStatusTransitionPolicy.for(status).allowedTransitions(),
      expectedTransitions[status],
    );
  }
});

test('allows only declared order status transitions', (): void => {
  for (const from of Object.values(OrderStatus)) {
    const policy = OrderStatusTransitionPolicy.for(from);

    for (const to of Object.values(OrderStatus)) {
      assert.equal(
        policy.canTransitionTo(to),
        expectedTransitions[from].includes(to),
        `${from} -> ${to}`,
      );
    }
  }
});

test('does not expose mutable transition state', (): void => {
  const policy = OrderStatusTransitionPolicy.for(OrderStatus.PAID);
  const allowed = policy.allowedTransitions();

  allowed.push(OrderStatus.DELIVERED);

  assert.deepEqual(
    policy.allowedTransitions(),
    expectedTransitions[OrderStatus.PAID],
  );
});

test('describes rejected transitions using the existing service error text', (): void => {
  const policy = OrderStatusTransitionPolicy.for(OrderStatus.PAID);

  assert.equal(
    policy.rejectionMessage(OrderStatus.DELIVERED),
    'Cannot transition from paid to delivered',
  );
});
