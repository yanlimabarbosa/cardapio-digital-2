import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidOrderCreationDraftError,
  OrderCreationDraft,
  type OrderCreationDraftItem,
} from '../../../src/modules/orders/domain/order-creation-draft.value-object';
import type { OrderItemSnapshot } from '../../../src/modules/orders/domain/order-item-snapshot.policy';

test('builds order creation totals and item drafts immutably', (): void => {
  const draft = OrderCreationDraft.empty()
    .addPaidItem(sampleSnapshot())
    .applyDeliveryFee({
      feeAmount: '3.00',
      feeCents: 300,
    })
    .applyCouponDiscount(200)
    .addRedeemedItem({
      productId: 'redeem-product-1',
      productName: 'Sobremesa Fidelidade',
      pointsSpent: 1,
    });

  assert.equal(draft.totalAmount(), '18.00');
  assert.equal(draft.totalCents(), 1800);
  assert.equal(draft.pointsSpent(), 1);
  assert.deepEqual(draft.items(), [
    {
      productId: 'paid-product-1',
      productName: 'Quentinha P',
      unitPriceCents: 1700,
      quantity: 1,
      subtotalCents: 1700,
      extras: [{ name: 'Queijo', price: 2 }],
      groupedExtras: [
        {
          groupId: 'group-1',
          groupName: 'Arroz',
          options: [{ name: 'Arroz branco', price: 0 }],
        },
      ],
      isRedeemed: false,
      pointsSpent: 0,
    },
    {
      productId: 'redeem-product-1',
      productName: 'Sobremesa Fidelidade',
      unitPriceCents: 0,
      quantity: 1,
      subtotalCents: 0,
      extras: [],
      groupedExtras: [],
      isRedeemed: true,
      pointsSpent: 1,
    },
  ]);

  const exposedItems = draft.items() as OrderCreationDraftItem[];
  exposedItems.push({
    productId: 'mutated',
    productName: 'Mutated',
    unitPriceCents: 999,
    quantity: 1,
    subtotalCents: 999,
    extras: [],
    groupedExtras: [],
    isRedeemed: false,
    pointsSpent: 0,
  });
  const paidItem = exposedItems[0];
  assert.ok(paidItem);
  const exposedExtras = paidItem.extras as Array<{ name: string; price: number }>;
  exposedExtras.push({ name: 'Mutated extra', price: 99 });

  const itemsAfterExternalMutation = draft.items();
  assert.equal(itemsAfterExternalMutation.length, 2);
  assert.equal(itemsAfterExternalMutation[0]?.extras.length, 1);
});

test('ignores pickup delivery fee resolutions', (): void => {
  const draft = OrderCreationDraft.empty()
    .addPaidItem(sampleSnapshot())
    .applyDeliveryFee({
      feeAmount: null,
      feeCents: 0,
    });

  assert.equal(draft.totalAmount(), '17.00');
  assert.equal(draft.items().length, 1);
});

test('rejects invalid draft item values', (): void => {
  assert.throws(
    () => OrderCreationDraft.empty().addRedeemedItem({
      productId: '',
      productName: 'Sobremesa Fidelidade',
      pointsSpent: 1,
    }),
    InvalidOrderCreationDraftError,
  );
  assert.throws(
    () => OrderCreationDraft.empty().addRedeemedItem({
      productId: 'redeem-product-1',
      productName: 'Sobremesa Fidelidade',
      pointsSpent: -1,
    }),
    InvalidOrderCreationDraftError,
  );
});

function sampleSnapshot(): OrderItemSnapshot {
  return {
    productId: 'paid-product-1',
    productName: 'Quentinha P',
    unitPriceCents: 1700,
    quantity: 1,
    subtotalCents: 1700,
    extras: [{ name: 'Queijo', price: 2 }],
    groupedExtras: [
      {
        groupId: 'group-1',
        groupName: 'Arroz',
        options: [{ name: 'Arroz branco', price: 0 }],
      },
    ],
  };
}
