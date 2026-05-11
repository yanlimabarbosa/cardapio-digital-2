import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { OptionGroup, Product, ProductExtra } from '../../../src/entities';
import { MikroOrmAdminProductExtraWriteRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-product-extra-write.repository';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('creates an admin product extra through the provided transaction context', async (): Promise<void> => {
  const product = createProduct('product-1');
  const em = new FakeEntityManager([product]);
  const repository = new MikroOrmAdminProductExtraWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.create(
    'product-1',
    { name: 'Farofa', price: 2.5, imageUrl: '/uploads/farofa.webp' },
    context,
  );

  assert.deepEqual(em.findOneCalls, [{ entity: Product, where: { id: 'product-1' } }]);
  assert.deepEqual(em.createCalls, [
    {
      entity: ProductExtra,
      data: {
        product,
        name: 'Farofa',
        price: '2.50',
        imageUrl: '/uploads/farofa.webp',
      },
    },
  ]);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'created',
    extra: {
      id: 'created-extra-1',
      name: 'Farofa',
      price: '2.50',
      imageUrl: '/uploads/farofa.webp',
      sortOrder: 0,
      isActive: true,
    },
  });
});

test('returns product-not-found without flushing when creating an extra for a missing product', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminProductExtraWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.create('missing-product', { name: 'Farofa', price: 2.5 }, context);

  assert.deepEqual(result, { status: 'product-not-found' });
  assert.deepEqual(em.findOneCalls, [{ entity: Product, where: { id: 'missing-product' } }]);
  assert.deepEqual(em.createCalls, []);
  assert.equal(em.flushCalls, 0);
});

test('creates an admin group option through the provided transaction context', async (): Promise<void> => {
  const product = createProduct('product-1');
  const optionGroup = createOptionGroup('group-1', product, 2);
  const em = new FakeEntityManager([], [], [optionGroup]);
  const repository = new MikroOrmAdminProductExtraWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.createForOptionGroup(
    'group-1',
    { name: 'Carne', price: 3.5, imageUrl: '/uploads/carne.webp' },
    context,
  );

  assert.deepEqual(em.findOneCalls, [
    {
      entity: OptionGroup,
      where: { id: 'group-1' },
      options: { populate: ['product', 'options'] },
    },
  ]);
  assert.deepEqual(em.createCalls, [
    {
      entity: ProductExtra,
      data: {
        product,
        optionGroup,
        name: 'Carne',
        price: '3.50',
        imageUrl: '/uploads/carne.webp',
        sortOrder: 2,
      },
    },
  ]);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'created',
    extra: {
      id: 'created-extra-1',
      name: 'Carne',
      price: '3.50',
      imageUrl: '/uploads/carne.webp',
      sortOrder: 2,
      isActive: true,
    },
  });
});

test('returns option-group-not-found without flushing when creating an option for a missing group', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminProductExtraWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.createForOptionGroup(
    'missing-group',
    { name: 'Carne', price: 3.5 },
    context,
  );

  assert.deepEqual(result, { status: 'option-group-not-found' });
  assert.deepEqual(em.findOneCalls, [
    {
      entity: OptionGroup,
      where: { id: 'missing-group' },
      options: { populate: ['product', 'options'] },
    },
  ]);
  assert.deepEqual(em.createCalls, []);
  assert.equal(em.flushCalls, 0);
});

test('soft-deletes an admin product extra through the provided transaction context', async (): Promise<void> => {
  const extra = createProductExtra('extra-1');
  const em = new FakeEntityManager([], [extra]);
  const repository = new MikroOrmAdminProductExtraWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.softDelete('extra-1', context);

  assert.equal(result, true);
  assert.deepEqual(em.findOneCalls, [{ entity: ProductExtra, where: { id: 'extra-1' } }]);
  assert.equal(extra.isActive, false);
  assert.equal(em.flushCalls, 1);
});

test('returns false without flushing when soft-deleting a missing extra', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminProductExtraWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.softDelete('missing-extra', context);

  assert.equal(result, false);
  assert.deepEqual(em.findOneCalls, [{ entity: ProductExtra, where: { id: 'missing-extra' } }]);
  assert.equal(em.flushCalls, 0);
});

test('reorders admin group options through the provided transaction context', async (): Promise<void> => {
  const option1 = createProductExtra('option-1');
  const option2 = createProductExtra('option-2');
  const em = new FakeEntityManager([], [option1, option2]);
  const repository = new MikroOrmAdminProductExtraWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  await repository.reorder(
    [
      { id: 'option-2', sortOrder: 0 },
      { id: 'missing-option', sortOrder: 1 },
      { id: 'option-1', sortOrder: 2 },
    ],
    context,
  );

  assert.deepEqual(em.findOneCalls, [
    { entity: ProductExtra, where: { id: 'option-2' } },
    { entity: ProductExtra, where: { id: 'missing-option' } },
    { entity: ProductExtra, where: { id: 'option-1' } },
  ]);
  assert.equal(option1.sortOrder, 2);
  assert.equal(option2.sortOrder, 0);
  assert.equal(em.flushCalls, 1);
});

test('updates an admin product extra through the provided transaction context', async (): Promise<void> => {
  const extra = createProductExtra('extra-1');
  const em = new FakeEntityManager([], [extra]);
  const repository = new MikroOrmAdminProductExtraWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update(
    'extra-1',
    { name: 'Molho', price: 3, imageUrl: '/uploads/molho.webp', isActive: false },
    context,
  );

  assert.deepEqual(em.findOneCalls, [{ entity: ProductExtra, where: { id: 'extra-1' } }]);
  assert.equal(extra.name, 'Molho');
  assert.equal(extra.price, '3.00');
  assert.equal(extra.imageUrl, '/uploads/molho.webp');
  assert.equal(extra.isActive, false);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'updated',
    extra: {
      id: 'extra-1',
      name: 'Molho',
      price: '3.00',
      imageUrl: '/uploads/molho.webp',
      sortOrder: 0,
      isActive: false,
    },
  });
});

test('returns extra-not-found without flushing when updating a missing extra', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminProductExtraWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update('missing-extra', { name: 'Molho' }, context);

  assert.deepEqual(result, { status: 'extra-not-found' });
  assert.deepEqual(em.findOneCalls, [{ entity: ProductExtra, where: { id: 'missing-extra' } }]);
  assert.equal(em.flushCalls, 0);
});

function createProduct(id: string): Product {
  const product = new Product();
  product.id = id;
  product.name = `Product ${id}`;
  product.price = '10.00';

  return product;
}

function createOptionGroup(id: string, product: Product, optionCount: number): OptionGroup {
  const optionGroup = new OptionGroup();
  optionGroup.id = id;
  optionGroup.product = product;
  optionGroup.name = `Group ${id}`;
  optionGroup.options = { length: optionCount } as unknown as OptionGroup['options'];

  return optionGroup;
}

function createProductExtra(id: string): ProductExtra {
  const extra = new ProductExtra();
  extra.id = id;
  extra.name = `Extra ${id}`;
  extra.price = '1.00';
  extra.sortOrder = 0;
  extra.isActive = true;

  return extra;
}

type FindOneEntity = typeof OptionGroup | typeof Product | typeof ProductExtra;

type FindOneOptions = {
  readonly populate: readonly ['product', 'options'];
};

type FindOneCall = {
  readonly entity: FindOneEntity;
  readonly options?: FindOneOptions;
  readonly where: { readonly id: string };
};

type ProductExtraCreateData = {
  readonly imageUrl?: string;
  readonly name: string;
  readonly optionGroup?: OptionGroup;
  readonly price: string;
  readonly product: Product;
  readonly sortOrder?: number;
};

type CreateCall = {
  readonly data: ProductExtraCreateData;
  readonly entity: typeof ProductExtra;
};

class FakeEntityManager {
  public readonly createCalls: CreateCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls = 0;

  public constructor(
    private readonly products: readonly Product[],
    private readonly extras: readonly ProductExtra[] = [],
    private readonly optionGroups: readonly OptionGroup[] = [],
  ) {}

  public async findOne(
    entity: typeof Product,
    where: { readonly id: string },
  ): Promise<Product | null>;
  public async findOne(
    entity: typeof ProductExtra,
    where: { readonly id: string },
  ): Promise<ProductExtra | null>;
  public async findOne(
    entity: typeof OptionGroup,
    where: { readonly id: string },
    options: FindOneOptions,
  ): Promise<OptionGroup | null>;
  public async findOne(
    entity: FindOneEntity,
    where: { readonly id: string },
    options?: FindOneOptions,
  ): Promise<OptionGroup | Product | ProductExtra | null> {
    const call: FindOneCall =
      options !== undefined ? { entity, where, options } : { entity, where };
    this.findOneCalls.push(call);

    if (entity === Product) {
      return this.products.find((product) => product.id === where.id) ?? null;
    }

    if (entity === OptionGroup) {
      return this.optionGroups.find((optionGroup) => optionGroup.id === where.id) ?? null;
    }

    return this.extras.find((extra) => extra.id === where.id) ?? null;
  }

  public create(entity: typeof ProductExtra, data: ProductExtraCreateData): ProductExtra {
    this.createCalls.push({ entity, data });

    const extra = new ProductExtra();
    extra.id = `created-extra-${this.createCalls.length}`;
    extra.product = data.product;
    extra.optionGroup = data.optionGroup;
    extra.name = data.name;
    extra.price = data.price;
    extra.imageUrl = data.imageUrl;
    if (data.sortOrder !== undefined) {
      extra.sortOrder = data.sortOrder;
    }

    return extra;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}
