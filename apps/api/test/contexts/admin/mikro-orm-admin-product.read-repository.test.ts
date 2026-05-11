import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Category, OptionGroup, Product, ProductExtra } from '../../../src/entities';
import { MikroOrmAdminProductReadRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-product.read-repository';

test('maps admin products without leaking ORM collections', async (): Promise<void> => {
  const createdAt = new Date('2026-05-07T12:00:00.000Z');
  const product = createProduct({ createdAt });
  const em = new FakeEntityManager([product]);
  const repository = new MikroOrmAdminProductReadRepository(em as unknown as EntityManager);

  const result = await repository.list();

  assert.deepEqual(em.findCalls, [
    {
      entity: Product,
      where: {},
      options: {
        populate: ['category', 'extras', 'optionGroups', 'optionGroups.options'],
        orderBy: { category: { sortOrder: 'ASC' }, sortOrder: 'ASC', name: 'ASC' },
      },
    },
  ]);
  assert.deepEqual(result, [
    {
      id: 'product-1',
      name: 'Quentinha',
      description: 'Lunch',
      price: 17.5,
      imageUrl: '/uploads/quentinha.webp',
      isActive: true,
      isCompound: false,
      categoryId: 'category-1',
      categoryName: 'Lunch',
      extras: [
        {
          id: 'extra-1',
          name: 'Farofa',
          price: 2.5,
          imageUrl: '/uploads/farofa.webp',
          sortOrder: 0,
          isActive: true,
        },
      ],
      optionGroups: [
        {
          id: 'group-2',
          name: 'Bebida',
          minSelections: 0,
          maxSelections: 1,
          sortOrder: 1,
          isActive: true,
          options: [],
        },
        {
          id: 'group-1',
          name: 'Carne',
          minSelections: 1,
          maxSelections: 2,
          sortOrder: 2,
          isActive: true,
          options: [
            {
              id: 'option-2',
              name: 'Frango',
              price: 4,
              imageUrl: undefined,
              sortOrder: 1,
              isActive: true,
            },
            {
              id: 'option-1',
              name: 'Bife',
              price: 5,
              imageUrl: undefined,
              sortOrder: 2,
              isActive: true,
            },
          ],
        },
      ],
      sortOrder: 0,
      isRedeemable: false,
      redemptionCost: 0,
      createdAt,
    },
  ]);
});

test('maps featured admin products through the read repository', async (): Promise<void> => {
  const product = createProduct({ createdAt: new Date('2026-05-07T12:00:00.000Z') });
  product.featuredOrder = undefined;
  const em = new FakeEntityManager([product]);
  const repository = new MikroOrmAdminProductReadRepository(em as unknown as EntityManager);

  const result = await repository.listFeatured();

  assert.deepEqual(em.findCalls, [
    {
      entity: Product,
      where: { isFeatured: true },
      options: { populate: ['category'], orderBy: { featuredOrder: 'ASC' } },
    },
  ]);
  assert.deepEqual(result, [
    {
      id: 'product-1',
      name: 'Quentinha',
      price: 17.5,
      imageUrl: '/uploads/quentinha.webp',
      categoryName: 'Lunch',
      featuredOrder: 0,
    },
  ]);
});

test('maps product extras through the read repository without filtering grouped options', async (): Promise<void> => {
  const product = createProduct({ createdAt: new Date('2026-05-07T12:00:00.000Z') });
  const em = new FakeEntityManager([product]);
  const repository = new MikroOrmAdminProductReadRepository(em as unknown as EntityManager);

  const result = await repository.listExtras('product-1');

  assert.deepEqual(em.findOneCalls, [
    { entity: Product, where: { id: 'product-1' }, options: { populate: ['extras'] } },
  ]);
  assert.deepEqual(result, [
    {
      id: 'extra-1',
      name: 'Farofa',
      price: 2.5,
      imageUrl: '/uploads/farofa.webp',
      isActive: true,
    },
    {
      id: 'option-1',
      name: 'Bife',
      price: 5,
      imageUrl: undefined,
      isActive: true,
    },
    {
      id: 'option-2',
      name: 'Frango',
      price: 4,
      imageUrl: undefined,
      isActive: true,
    },
  ]);
});

test('maps product option groups through the read repository', async (): Promise<void> => {
  const product = createProduct({ createdAt: new Date('2026-05-07T12:00:00.000Z') });
  const em = new FakeEntityManager([product]);
  const repository = new MikroOrmAdminProductReadRepository(em as unknown as EntityManager);

  const result = await repository.listOptionGroups('product-1');

  assert.deepEqual(em.findOneCalls, [
    {
      entity: Product,
      where: { id: 'product-1' },
      options: { populate: ['optionGroups', 'optionGroups.options'] },
    },
  ]);
  assert.deepEqual(result, [
    {
      id: 'group-2',
      name: 'Bebida',
      minSelections: 0,
      maxSelections: 1,
      sortOrder: 1,
      isActive: true,
      options: [],
    },
    {
      id: 'group-1',
      name: 'Carne',
      minSelections: 1,
      maxSelections: 2,
      sortOrder: 2,
      isActive: true,
      options: [
        {
          id: 'option-2',
          name: 'Frango',
          price: 4,
          imageUrl: undefined,
          sortOrder: 1,
          isActive: true,
        },
        {
          id: 'option-1',
          name: 'Bife',
          price: 5,
          imageUrl: undefined,
          sortOrder: 2,
          isActive: true,
        },
      ],
    },
  ]);
});

test('returns null when listing extras for a missing product', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminProductReadRepository(em as unknown as EntityManager);

  const result = await repository.listExtras('missing-product');

  assert.equal(result, null);
  assert.deepEqual(em.findOneCalls, [
    { entity: Product, where: { id: 'missing-product' }, options: { populate: ['extras'] } },
  ]);
});

test('returns null when listing option groups for a missing product', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminProductReadRepository(em as unknown as EntityManager);

  const result = await repository.listOptionGroups('missing-product');

  assert.equal(result, null);
  assert.deepEqual(em.findOneCalls, [
    {
      entity: Product,
      where: { id: 'missing-product' },
      options: { populate: ['optionGroups', 'optionGroups.options'] },
    },
  ]);
});

type CreateProductOptions = {
  readonly createdAt: Date;
};

function createProduct(options: CreateProductOptions): Product {
  const category = new Category();
  category.id = 'category-1';
  category.name = 'Lunch';

  const product = new Product();
  product.id = 'product-1';
  product.name = 'Quentinha';
  product.description = 'Lunch';
  product.price = '17.50';
  product.imageUrl = '/uploads/quentinha.webp';
  product.isActive = undefined;
  product.isCompound = undefined;
  product.category = category;
  product.sortOrder = undefined;
  product.isRedeemable = undefined;
  product.redemptionCost = undefined;
  product.createdAt = options.createdAt;

  const flatExtra = createExtra({
    id: 'extra-1',
    name: 'Farofa',
    price: '2.50',
    imageUrl: '/uploads/farofa.webp',
    sortOrder: undefined,
    optionGroup: undefined,
    product,
  });

  const firstGroup = createOptionGroup({
    id: 'group-1',
    name: 'Carne',
    minSelections: 1,
    maxSelections: 2,
    sortOrder: 2,
    product,
  });
  const secondGroup = createOptionGroup({
    id: 'group-2',
    name: 'Bebida',
    minSelections: undefined,
    maxSelections: undefined,
    sortOrder: 1,
    product,
  });

  const firstOption = createExtra({
    id: 'option-1',
    name: 'Bife',
    price: '5.00',
    imageUrl: undefined,
    sortOrder: 2,
    optionGroup: firstGroup,
    product,
  });
  const secondOption = createExtra({
    id: 'option-2',
    name: 'Frango',
    price: '4.00',
    imageUrl: undefined,
    sortOrder: 1,
    optionGroup: firstGroup,
    product,
  });

  product.extras = createCollection([flatExtra, firstOption, secondOption]) as unknown as Product['extras'];
  firstGroup.options = createCollection([firstOption, secondOption]) as unknown as OptionGroup['options'];
  secondGroup.options = createCollection([]) as unknown as OptionGroup['options'];
  product.optionGroups = createCollection([firstGroup, secondGroup]) as unknown as Product['optionGroups'];

  return product;
}

type CreateExtraOptions = {
  readonly id: string;
  readonly imageUrl?: string;
  readonly name: string;
  readonly optionGroup?: OptionGroup;
  readonly price: string;
  readonly product: Product;
  readonly sortOrder?: number;
};

function createExtra(options: CreateExtraOptions): ProductExtra {
  const extra = new ProductExtra();
  extra.id = options.id;
  extra.name = options.name;
  extra.price = options.price;
  extra.imageUrl = options.imageUrl;
  extra.sortOrder = options.sortOrder;
  extra.optionGroup = options.optionGroup;
  extra.product = options.product;
  extra.isActive = undefined;

  return extra;
}

type CreateOptionGroupOptions = {
  readonly id: string;
  readonly maxSelections?: number;
  readonly minSelections?: number;
  readonly name: string;
  readonly product: Product;
  readonly sortOrder: number;
};

function createOptionGroup(options: CreateOptionGroupOptions): OptionGroup {
  const group = new OptionGroup();
  group.id = options.id;
  group.name = options.name;
  group.minSelections = options.minSelections;
  group.maxSelections = options.maxSelections;
  group.sortOrder = options.sortOrder;
  group.product = options.product;
  group.isActive = undefined;

  return group;
}

function createCollection<T>(items: readonly T[]): FakeCollection<T> {
  return new FakeCollection(items);
}

class FakeCollection<T> {
  public constructor(private readonly items: readonly T[]) {}

  public getItems(): T[] {
    return [...this.items];
  }
}

type FindCall = {
  readonly entity: typeof Product;
  readonly options: unknown;
  readonly where: Record<string, unknown>;
};

type FindOneCall = {
  readonly entity: typeof Product;
  readonly options: { readonly populate: readonly string[] };
  readonly where: { readonly id: string };
};

class FakeEntityManager {
  public readonly findCalls: FindCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];

  public constructor(private readonly products: readonly Product[]) {}

  public async find(
    entity: typeof Product,
    where: Record<string, unknown>,
    options: unknown,
  ): Promise<readonly Product[]> {
    this.findCalls.push({ entity, where, options });
    return this.products;
  }

  public async findOne(
    entity: typeof Product,
    where: { readonly id: string },
    options: { readonly populate: readonly string[] },
  ): Promise<Product | null> {
    this.findOneCalls.push({ entity, where, options });

    return this.products.find((product) => product.id === where.id) ?? null;
  }
}
