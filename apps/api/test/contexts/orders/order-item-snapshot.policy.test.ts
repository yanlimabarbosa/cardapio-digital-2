import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidOrderItemSnapshotError,
  OrderItemSnapshotPolicy,
  type OrderItemSnapshotProductInput,
} from '../../../src/modules/orders/domain/order-item-snapshot.policy';

test('creates a simple item snapshot with flat extras', (): void => {
  const result = OrderItemSnapshotPolicy.for(sampleProduct(), {
    quantity: 2,
    extraIds: ['extra-1'],
  }).createSnapshot();

  assert.deepEqual(result, {
    productId: 'product-1',
    productName: 'Quentinha',
    quantity: 2,
    unitPriceCents: 1250,
    subtotalCents: 2500,
    extras: [{ name: 'Queijo', price: 2.5 }],
    groupedExtras: [],
  });
});

test('creates a compound item snapshot with grouped options', (): void => {
  const result = OrderItemSnapshotPolicy.for(compoundProduct(), {
    quantity: 1,
    optionSelections: [
      {
        groupId: 'group-1',
        optionIds: ['option-1'],
      },
    ],
  }).createSnapshot();

  assert.deepEqual(result, {
    productId: 'product-1',
    productName: 'Quentinha',
    quantity: 1,
    unitPriceCents: 1300,
    subtotalCents: 1300,
    extras: [],
    groupedExtras: [
      {
        groupId: 'group-1',
        groupName: 'Arroz',
        options: [{ name: 'Arroz branco', price: 3 }],
      },
    ],
  });
});

test('rejects unavailable products with the existing message', (): void => {
  assertInvalidSnapshot(
    () => OrderItemSnapshotPolicy.for({ ...sampleProduct(), isActive: false }, { quantity: 1 }).createSnapshot(),
    'Product Quentinha is unavailable',
  );
});

test('rejects missing flat extras with the existing message', (): void => {
  assertInvalidSnapshot(
    () => OrderItemSnapshotPolicy.for(sampleProduct(), { quantity: 1, extraIds: ['missing'] }).createSnapshot(),
    'Extra missing not found or unavailable',
  );
});

test('rejects missing compound option groups with the existing message', (): void => {
  assertInvalidSnapshot(
    () =>
      OrderItemSnapshotPolicy.for(compoundProduct(), {
        quantity: 1,
        optionSelections: [{ groupId: 'missing-group', optionIds: ['option-1'] }],
      }).createSnapshot(),
    'Grupo de opcoes missing-group nao encontrado',
  );
});

test('rejects compound option selections above max with the existing message', (): void => {
  assertInvalidSnapshot(
    () =>
      OrderItemSnapshotPolicy.for(compoundProduct(), {
        quantity: 1,
        optionSelections: [{ groupId: 'group-1', optionIds: ['option-1', 'option-2'] }],
      }).createSnapshot(),
    'Grupo "Arroz" permite no maximo 1 opcao(oes)',
  );
});

test('rejects missing required compound groups with the existing message', (): void => {
  assertInvalidSnapshot(
    () =>
      OrderItemSnapshotPolicy.for(compoundProduct(), {
        quantity: 1,
        optionSelections: [{ groupId: 'group-2', optionIds: ['option-3'] }],
      }).createSnapshot(),
    'Grupo obrigatorio "Arroz" requer pelo menos 1 opcao(oes)',
  );
});

test('preserves legacy behavior for compound products without option selections', (): void => {
  const result = OrderItemSnapshotPolicy.for(compoundProduct(), { quantity: 1 }).createSnapshot();

  assert.deepEqual(result, {
    productId: 'product-1',
    productName: 'Quentinha',
    quantity: 1,
    unitPriceCents: 1000,
    subtotalCents: 1000,
    extras: [],
    groupedExtras: [],
  });
});

function assertInvalidSnapshot(createSnapshot: () => void, message: string): void {
  assert.throws(
    createSnapshot,
    (error: unknown): boolean =>
      error instanceof InvalidOrderItemSnapshotError && error.message === message,
  );
}

function sampleProduct(): OrderItemSnapshotProductInput {
  return {
    id: 'product-1',
    name: 'Quentinha',
    baseUnitPriceCents: 1000,
    isActive: true,
    isCompound: false,
    extras: [
      {
        id: 'extra-1',
        name: 'Queijo',
        price: '2.50',
        isActive: true,
      },
    ],
    optionGroups: [],
  };
}

function compoundProduct(): OrderItemSnapshotProductInput {
  return {
    ...sampleProduct(),
    isCompound: true,
    extras: [],
    optionGroups: [
      {
        id: 'group-1',
        name: 'Arroz',
        minSelections: 1,
        maxSelections: 1,
        isActive: true,
        options: [
          {
            id: 'option-1',
            name: 'Arroz branco',
            price: '3.00',
            isActive: true,
          },
          {
            id: 'option-2',
            name: 'Arroz integral',
            price: '4.00',
            isActive: true,
          },
        ],
      },
      {
        id: 'group-2',
        name: 'Feijao',
        minSelections: 0,
        maxSelections: 1,
        isActive: true,
        options: [
          {
            id: 'option-3',
            name: 'Feijao preto',
            price: '0.00',
            isActive: true,
          },
        ],
      },
    ],
  };
}
