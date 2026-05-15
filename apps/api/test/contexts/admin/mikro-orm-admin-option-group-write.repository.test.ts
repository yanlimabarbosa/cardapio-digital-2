import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { OptionGroup, Product } from '../../../src/entities';
import { MikroOrmAdminOptionGroupWriteRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-option-group-write.repository';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('creates an admin option group through the provided transaction context', async (): Promise<void> => {
  const product = createProduct('product-1');
  const em = new FakeEntityManager([product], 3);
  const repository = new MikroOrmAdminOptionGroupWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.create(
    'product-1',
    { name: 'Carne', minSelections: 1, maxSelections: 2 },
    context,
  );

  assert.deepEqual(em.findOneCalls, [{ entity: Product, where: { id: 'product-1' } }]);
  assert.deepEqual(em.countCalls, [{ entity: OptionGroup, where: { product } }]);
  assert.deepEqual(em.createCalls, [
    {
      entity: OptionGroup,
      data: {
        product,
        name: 'Carne',
        minSelections: 1,
        maxSelections: 2,
        sortOrder: 3,
      },
    },
  ]);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'created',
    optionGroup: {
      id: 'created-option-group-1',
      name: 'Carne',
      minSelections: 1,
      maxSelections: 2,
      sortOrder: 3,
      isActive: true,
      options: [],
    },
  });
});

test('uses an explicit option group sort order when provided', async (): Promise<void> => {
  const product = createProduct('product-1');
  const em = new FakeEntityManager([product], 3);
  const repository = new MikroOrmAdminOptionGroupWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  await repository.create(
    'product-1',
    { name: 'Bebida', minSelections: 0, maxSelections: 1, sortOrder: 0 },
    context,
  );

  assert.equal(em.createCalls[0]?.data.sortOrder, 0);
});

test('returns product-not-found without flushing when creating an option group for a missing product', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminOptionGroupWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.create(
    'missing-product',
    { name: 'Carne', minSelections: 1, maxSelections: 2 },
    context,
  );

  assert.deepEqual(result, { status: 'product-not-found' });
  assert.deepEqual(em.findOneCalls, [{ entity: Product, where: { id: 'missing-product' } }]);
  assert.deepEqual(em.countCalls, []);
  assert.deepEqual(em.createCalls, []);
  assert.equal(em.flushCalls, 0);
});

test('reorders admin option groups through the provided transaction context', async (): Promise<void> => {
  const firstOptionGroup = createOptionGroup('group-1');
  const secondOptionGroup = createOptionGroup('group-2');
  const em = new FakeEntityManager([], 0, [firstOptionGroup, secondOptionGroup]);
  const repository = new MikroOrmAdminOptionGroupWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  await repository.reorder(
    [
      { id: 'group-1', sortOrder: 2 },
      { id: 'missing-group', sortOrder: 3 },
      { id: 'group-2', sortOrder: 1 },
    ],
    context,
  );

  assert.deepEqual(em.findOneCalls, [
    { entity: OptionGroup, where: { id: 'group-1' } },
    { entity: OptionGroup, where: { id: 'missing-group' } },
    { entity: OptionGroup, where: { id: 'group-2' } },
  ]);
  assert.equal(firstOptionGroup.sortOrder, 2);
  assert.equal(secondOptionGroup.sortOrder, 1);
  assert.equal(em.flushCalls, 1);
});

test('soft-deletes an admin option group through the provided transaction context', async (): Promise<void> => {
  const optionGroup = createOptionGroup('group-1', { minSelections: 1, maxSelections: 2 });
  const em = new FakeEntityManager([], 0, [optionGroup]);
  const repository = new MikroOrmAdminOptionGroupWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.softDelete('group-1', context);

  assert.equal(result, true);
  assert.deepEqual(em.findOneCalls, [{ entity: OptionGroup, where: { id: 'group-1' } }]);
  assert.equal(optionGroup.isActive, true);
  assert.equal(optionGroup.isArchived, true);
  assert.equal(em.flushCalls, 1);
});

test('returns false without flushing when soft-deleting a missing option group', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminOptionGroupWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.softDelete('missing-group', context);

  assert.equal(result, false);
  assert.deepEqual(em.findOneCalls, [{ entity: OptionGroup, where: { id: 'missing-group' } }]);
  assert.equal(em.flushCalls, 0);
});

test('updates an admin option group through the provided transaction context', async (): Promise<void> => {
  const optionGroup = createOptionGroup('group-1', { minSelections: 1, maxSelections: 2 });
  const em = new FakeEntityManager([], 0, [optionGroup]);
  const repository = new MikroOrmAdminOptionGroupWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update(
    'group-1',
    {
      name: 'Molhos',
      minSelections: 0,
      maxSelections: 3,
      sortOrder: 2,
      isActive: false,
    },
    context,
  );

  assert.deepEqual(em.findOneCalls, [{ entity: OptionGroup, where: { id: 'group-1' } }]);
  assert.equal(optionGroup.name, 'Molhos');
  assert.equal(optionGroup.minSelections, 0);
  assert.equal(optionGroup.maxSelections, 3);
  assert.equal(optionGroup.sortOrder, 2);
  assert.equal(optionGroup.isActive, false);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'updated',
    optionGroup: {
      id: 'group-1',
      name: 'Molhos',
      minSelections: 0,
      maxSelections: 3,
      sortOrder: 2,
      isActive: false,
      options: [],
    },
  });
});

test('returns option-group-not-found without flushing when updating a missing option group', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminOptionGroupWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update('missing-group', { name: 'Molhos' }, context);

  assert.deepEqual(result, { status: 'option-group-not-found' });
  assert.deepEqual(em.findOneCalls, [{ entity: OptionGroup, where: { id: 'missing-group' } }]);
  assert.equal(em.flushCalls, 0);
});

test('returns invalid selection without mutating when update bounds are invalid', async (): Promise<void> => {
  const optionGroup = createOptionGroup('group-1', { minSelections: 1, maxSelections: 2 });
  const em = new FakeEntityManager([], 0, [optionGroup]);
  const repository = new MikroOrmAdminOptionGroupWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update('group-1', { minSelections: 3 }, context);

  assert.deepEqual(result, {
    status: 'invalid-selection-range',
    message: 'minSelections cannot be greater than maxSelections',
  });
  assert.equal(optionGroup.minSelections, 1);
  assert.equal(optionGroup.maxSelections, 2);
  assert.equal(em.flushCalls, 0);
});

function createProduct(id: string): Product {
  const product = new Product();
  product.id = id;
  product.name = `Product ${id}`;
  product.price = '10.00';

  return product;
}

function createOptionGroup(
  id: string,
  overrides: { readonly maxSelections?: number; readonly minSelections?: number } = {},
): OptionGroup {
  const optionGroup = new OptionGroup();
  optionGroup.id = id;
  optionGroup.name = `Group ${id}`;
  optionGroup.minSelections = overrides.minSelections;
  optionGroup.maxSelections = overrides.maxSelections;
  optionGroup.sortOrder = 0;
  optionGroup.isActive = true;

  return optionGroup;
}

type FindOneEntity = typeof OptionGroup | typeof Product;

type FindOneCall = {
  readonly entity: FindOneEntity;
  readonly where: { readonly id: string };
};

type CountCall = {
  readonly entity: typeof OptionGroup;
  readonly where: { readonly product: Product };
};

type OptionGroupCreateData = {
  readonly maxSelections: number;
  readonly minSelections: number;
  readonly name: string;
  readonly product: Product;
  readonly sortOrder: number;
};

type CreateCall = {
  readonly data: OptionGroupCreateData;
  readonly entity: typeof OptionGroup;
};

class FakeEntityManager {
  public readonly countCalls: CountCall[] = [];
  public readonly createCalls: CreateCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls = 0;

  public constructor(
    private readonly products: readonly Product[],
    private readonly optionGroupCount = 0,
    private readonly optionGroups: readonly OptionGroup[] = [],
  ) {}

  public async findOne(
    entity: FindOneEntity,
    where: { readonly id: string },
  ): Promise<OptionGroup | Product | null> {
    this.findOneCalls.push({ entity, where });

    if (entity === Product) {
      return this.products.find((product) => product.id === where.id) ?? null;
    }

    return this.optionGroups.find((optionGroup) => optionGroup.id === where.id) ?? null;
  }

  public async count(
    entity: typeof OptionGroup,
    where: { readonly product: Product },
  ): Promise<number> {
    this.countCalls.push({ entity, where });

    return this.optionGroupCount;
  }

  public create(entity: typeof OptionGroup, data: OptionGroupCreateData): OptionGroup {
    this.createCalls.push({ entity, data });

    const optionGroup = new OptionGroup();
    optionGroup.id = `created-option-group-${this.createCalls.length}`;
    optionGroup.product = data.product;
    optionGroup.name = data.name;
    optionGroup.minSelections = data.minSelections;
    optionGroup.maxSelections = data.maxSelections;
    optionGroup.sortOrder = data.sortOrder;

    return optionGroup;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}
