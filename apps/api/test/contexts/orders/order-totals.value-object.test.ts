import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderTotals } from '../../../src/modules/orders/domain/order-totals.value-object';

test('accumulates item subtotals and delivery fees', (): void => {
  const totals = OrderTotals.empty()
    .addItemSubtotal(700)
    .addItemSubtotal(300)
    .addDeliveryFee(250);

  assert.deepEqual(totals.snapshot(), {
    itemSubtotalCents: 1000,
    deliveryFeeCents: 250,
    discountCents: 0,
    totalCents: 1250,
  });
  assert.equal(totals.totalAmount(), '12.50');
});

test('applies discounts and clamps total at zero', (): void => {
  const totals = OrderTotals.empty()
    .addItemSubtotal(700)
    .addDeliveryFee(300)
    .applyDiscount(1200);

  assert.deepEqual(totals.snapshot(), {
    itemSubtotalCents: 700,
    deliveryFeeCents: 300,
    discountCents: 1200,
    totalCents: 0,
  });
  assert.equal(totals.totalAmount(), '0.00');
});

test('keeps value objects immutable', (): void => {
  const original = OrderTotals.empty();
  const changed = original.addItemSubtotal(500);

  assert.equal(original.totalCents(), 0);
  assert.equal(changed.totalCents(), 500);
});

test('rejects invalid cent amounts', (): void => {
  assertInvalidCents(() => OrderTotals.empty().addItemSubtotal(-1));
  assertInvalidCents(() => OrderTotals.empty().addDeliveryFee(1.5));
  assertInvalidCents(() => OrderTotals.empty().applyDiscount(Number.NaN));
});

function assertInvalidCents(changeTotals: () => unknown): void {
  assert.throws(
    changeTotals,
    /Order totals .* must be a non-negative integer amount of cents/,
  );
}
