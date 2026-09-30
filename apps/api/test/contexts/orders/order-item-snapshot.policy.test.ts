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

test('combined limit: 2 proteinas + 1 churrasco excede o teto de 2 carnes', (): void => {
  assert.throws(
    () =>
      OrderItemSnapshotPolicy.for(combinedLimitProduct(), {
        quantity: 1,
        optionSelections: [
          { groupId: 'g-prot', optionIds: ['o1', 'o2'] },
          { groupId: 'g-chur', optionIds: ['o3'] },
        ],
      }).createSnapshot(),
    (error: unknown): boolean => error instanceof InvalidOrderItemSnapshotError,
  );
});

test('combined limit: 1 proteina + 1 churrasco e permitido', (): void => {
  assert.doesNotThrow(() =>
    OrderItemSnapshotPolicy.for(combinedLimitProduct(), {
      quantity: 1,
      optionSelections: [
        { groupId: 'g-prot', optionIds: ['o1'] },
        { groupId: 'g-chur', optionIds: ['o3'] },
      ],
    }).createSnapshot(),
  );
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

function combinedLimitProduct(): OrderItemSnapshotProductInput {
  return {
    id: 'p1',
    name: 'Quentinha M',
    baseUnitPriceCents: 2500,
    isActive: true,
    isCompound: true,
    extras: [],
    combinedLimits: [{ id: 'cl1', name: 'Carnes', maxSelections: 2 }],
    optionGroups: [
      {
        id: 'g-prot',
        name: 'Proteína',
        isActive: true,
        minSelections: 0,
        maxSelections: 2,
        combinedLimitId: 'cl1',
        options: [
          { id: 'o1', name: 'Frango', price: '0', isActive: true },
          { id: 'o2', name: 'Carne', price: '0', isActive: true },
        ],
      },
      {
        id: 'g-chur',
        name: 'Churrasco',
        isActive: true,
        minSelections: 0,
        maxSelections: 2,
        combinedLimitId: 'cl1',
        options: [
          { id: 'o3', name: 'Picanha', price: '0', isActive: true },
          { id: 'o4', name: 'Linguiça', price: '0', isActive: true },
        ],
      },
    ],
  };
}

test('groups repeated options as "Nx" and charges each repetition when the group allows repeats', (): void => {
  const result = OrderItemSnapshotPolicy.for(espetoProduct(), {
    quantity: 1,
    optionSelections: [{ groupId: 'espetos', optionIds: ['frango', 'carne', 'frango'] }],
  }).createSnapshot();

  assert.equal(result.unitPriceCents, 800 + 800 + 900);
  assert.deepEqual(result.groupedExtras, [
    {
      groupId: 'espetos',
      groupName: 'Espeto',
      options: [
        { name: '2x Frango', price: 16 },
        { name: 'Carne', price: 9 },
      ],
    },
  ]);
});

test('counts repeated options against the group max', (): void => {
  assertInvalidSnapshot(
    () =>
      OrderItemSnapshotPolicy.for(espetoProduct(3), {
        quantity: 1,
        optionSelections: [{ groupId: 'espetos', optionIds: ['frango', 'frango', 'frango', 'carne'] }],
      }).createSnapshot(),
    'Grupo "Espeto" permite no maximo 3 opcao(oes)',
  );
});

test('rejects repeated options when the group does not allow repeats', (): void => {
  const product = compoundProduct();
  const groups = product.optionGroups.map((group) =>
    group.id === 'group-1' ? { ...group, maxSelections: 2 } : group,
  );

  assertInvalidSnapshot(
    () =>
      OrderItemSnapshotPolicy.for({ ...product, optionGroups: groups }, {
        quantity: 1,
        optionSelections: [{ groupId: 'group-1', optionIds: ['option-1', 'option-1'] }],
      }).createSnapshot(),
    'Grupo "Arroz" nao permite repetir opcoes',
  );
});

function espetoProduct(maxSelections = 30): OrderItemSnapshotProductInput {
  return {
    ...sampleProduct(),
    baseUnitPriceCents: 0,
    isCompound: true,
    extras: [],
    optionGroups: [
      {
        id: 'espetos',
        name: 'Espeto',
        minSelections: 1,
        maxSelections,
        allowRepeat: true,
        isActive: true,
        options: [
          { id: 'frango', name: 'Frango', price: '8.00', isActive: true },
          { id: 'carne', name: 'Carne', price: '9.00', isActive: true },
        ],
      },
    ],
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
