import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Category, Product } from '../../../src/entities';
import { MikroOrmAdminProductWriteRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-product-write.repository';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('creates an admin product through the provided transaction context', async (): Promise<void> => {
  const category = createCategory('category-1', 'Lunch');
  const em = new FakeEntityManager([], [category]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.create(
    {
      name: 'New product',
      categoryId: 'category-1',
      price: 17.5,
      description: 'Description',
      imageUrl: '/uploads/product.webp',
      isCompound: true,
      isRedeemable: true,
      redemptionCost: 10,
    },
    context,
  );

  assert.deepEqual(em.findOneCalls, [{ entity: Category, where: { id: 'category-1' } }]);
  assert.deepEqual(em.createCalls, [
    {
      entity: Product,
      data: {
        name: 'New product',
        category,
        price: '17.50',
        description: 'Description',
        imageUrl: '/uploads/product.webp',
        isCompound: true,
        isRedeemable: true,
        redemptionCost: 10,
      },
    },
  ]);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'created',
    product: {
      id: 'created-product-1',
      category: { id: 'category-1', name: 'Lunch' },
      name: 'New product',
      description: 'Description',
      price: '17.50',
      imageUrl: '/uploads/product.webp',
      sortOrder: 0,
      isActive: true,
      isSoldOut: false,
      isFeatured: false,
      featuredOrder: 0,
      isPromotional: false,
      promotionalPrice: undefined,
      promotionStartDate: undefined,
      promotionEndDate: undefined,
      isCompound: true,
      isRedeemable: true,
      redemptionCost: 10,
      createdAt: em.createdProducts[0]?.createdAt,
      updatedAt: em.createdProducts[0]?.updatedAt,
    },
  });
});

test('returns category-not-found without flushing when creating with a missing category', async (): Promise<void> => {
  const em = new FakeEntityManager([], []);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.create(
    { name: 'Missing', categoryId: 'missing-category', price: 17.5 },
    context,
  );

  assert.deepEqual(result, { status: 'category-not-found', categoryId: 'missing-category' });
  assert.deepEqual(em.findOneCalls, [{ entity: Category, where: { id: 'missing-category' } }]);
  assert.deepEqual(em.createCalls, []);
  assert.equal(em.flushCalls, 0);
});

test('reorders admin products through the provided transaction context', async (): Promise<void> => {
  const firstProduct = createProduct('product-1', 0);
  const em = new FakeEntityManager([firstProduct]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  await repository.reorder(
    [
      { id: 'product-1', sortOrder: 2 },
      { id: 'missing-product', sortOrder: 1 },
    ],
    context,
  );

  assert.deepEqual(em.findOneCalls, [
    { entity: Product, where: { id: 'product-1' } },
    { entity: Product, where: { id: 'missing-product' } },
  ]);
  assert.equal(firstProduct.sortOrder, 2);
  assert.equal(em.flushCalls, 1);
});

test('sets featured admin products through the provided transaction context', async (): Promise<void> => {
  const firstProduct = createProduct('product-1', 0);
  firstProduct.isFeatured = true;
  firstProduct.featuredOrder = 9;
  const secondProduct = createProduct('product-2', 0);
  const removedProduct = createProduct('product-3', 0);
  removedProduct.isFeatured = true;
  removedProduct.featuredOrder = 4;
  const em = new FakeEntityManager([firstProduct, secondProduct, removedProduct]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  await repository.setFeatured(
    ['product-2', 'missing-product', 'product-1', 'product-2'],
    context,
  );

  assert.deepEqual(em.findCalls, [{ entity: Product, where: { isFeatured: true } }]);
  assert.deepEqual(em.findOneCalls, [
    { entity: Product, where: { id: 'product-2' } },
    { entity: Product, where: { id: 'missing-product' } },
    { entity: Product, where: { id: 'product-1' } },
    { entity: Product, where: { id: 'product-2' } },
  ]);
  assert.equal(firstProduct.isFeatured, true);
  assert.equal(firstProduct.featuredOrder, 2);
  assert.equal(secondProduct.isFeatured, true);
  assert.equal(secondProduct.featuredOrder, 3);
  assert.equal(removedProduct.isFeatured, false);
  assert.equal(removedProduct.featuredOrder, 0);
  assert.equal(em.flushCalls, 1);
});

test('soft-deletes an admin product through the provided transaction context', async (): Promise<void> => {
  const product = createProduct('product-1', 0);
  product.isActive = true;
  const em = new FakeEntityManager([product]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.softDelete('product-1', context);

  assert.equal(result, true);
  assert.deepEqual(em.findOneCalls, [{ entity: Product, where: { id: 'product-1' } }]);
  assert.equal(product.isActive, true);
  assert.equal(product.isArchived, true);
  assert.equal(product.isFeatured, false);
  assert.equal(em.flushCalls, 1);
});

test('returns false without flushing when the admin product is missing', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.softDelete('missing-product', context);

  assert.equal(result, false);
  assert.deepEqual(em.findOneCalls, [{ entity: Product, where: { id: 'missing-product' } }]);
  assert.equal(em.flushCalls, 0);
});

test('toggles an active admin product through the provided transaction context', async (): Promise<void> => {
  const product = createProduct('product-1', 0);
  product.isActive = true;
  const em = new FakeEntityManager([product]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.toggleActive('product-1', context);

  assert.deepEqual(result, { id: 'product-1', isActive: false });
  assert.deepEqual(em.findOneCalls, [{ entity: Product, where: { id: 'product-1' } }]);
  assert.equal(product.isActive, false);
  assert.equal(em.flushCalls, 1);
});

test('toggles an inactive admin product through the provided transaction context', async (): Promise<void> => {
  const product = createProduct('product-1', 0);
  product.isActive = false;
  const em = new FakeEntityManager([product]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.toggleActive('product-1', context);

  assert.deepEqual(result, { id: 'product-1', isActive: true });
  assert.deepEqual(em.findOneCalls, [{ entity: Product, where: { id: 'product-1' } }]);
  assert.equal(product.isActive, true);
  assert.equal(em.flushCalls, 1);
});

test('returns null without flushing when toggling a missing admin product', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.toggleActive('missing-product', context);

  assert.equal(result, null);
  assert.deepEqual(em.findOneCalls, [{ entity: Product, where: { id: 'missing-product' } }]);
  assert.equal(em.flushCalls, 0);
});

test('updates an admin product through the provided transaction context', async (): Promise<void> => {
  const oldCategory = createCategory('category-1', 'Lunch');
  const newCategory = createCategory('category-2', 'Dinner');
  const product = createProduct('product-1', 0, oldCategory);
  product.description = 'Old description';
  product.imageUrl = '/uploads/old.webp';
  product.isActive = true;
  product.isPromotional = false;
  product.isCompound = false;
  product.isRedeemable = false;
  product.createdAt = new Date('2026-05-07T12:00:00.000Z');
  product.updatedAt = new Date('2026-05-07T12:30:00.000Z');
  const em = new FakeEntityManager([product], [oldCategory, newCategory]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update(
    'product-1',
    {
      name: 'Updated product',
      categoryId: 'category-2',
      price: 22.5,
      description: 'Updated description',
      imageUrl: '/uploads/new.webp',
      isActive: false,
      isPromotional: true,
      promotionalPrice: 19.5,
      promotionStartDate: '2026-05-07T12:00:00.000Z',
      promotionEndDate: null,
      isCompound: true,
      isRedeemable: true,
      redemptionCost: 25,
    },
    context,
  );

  assert.deepEqual(em.findOneCalls, [
    { entity: Product, where: { id: 'product-1' }, options: { populate: ['category'] } },
    { entity: Category, where: { id: 'category-2' } },
  ]);
  assert.equal(product.category, newCategory);
  assert.equal(product.name, 'Updated product');
  assert.equal(product.description, 'Updated description');
  assert.equal(product.price, '22.50');
  assert.equal(product.imageUrl, '/uploads/new.webp');
  assert.equal(product.isActive, false);
  assert.equal(product.isPromotional, true);
  assert.equal(product.promotionalPrice, '19.50');
  assert.deepEqual(product.promotionStartDate, new Date('2026-05-07T12:00:00.000Z'));
  assert.equal(product.promotionEndDate, undefined);
  assert.equal(product.isCompound, true);
  assert.equal(product.isRedeemable, true);
  assert.equal(product.redemptionCost, 25);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'updated',
    product: {
      id: 'product-1',
      category: { id: 'category-2', name: 'Dinner' },
      name: 'Updated product',
      description: 'Updated description',
      price: '22.50',
      imageUrl: '/uploads/new.webp',
      sortOrder: 0,
      isActive: false,
      isSoldOut: false,
      isFeatured: false,
      featuredOrder: 0,
      isPromotional: true,
      promotionalPrice: '19.50',
      promotionStartDate: new Date('2026-05-07T12:00:00.000Z'),
      promotionEndDate: undefined,
      isCompound: true,
      isRedeemable: true,
      redemptionCost: 25,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    },
  });
});

test('clears promotional fields when disabling promotion on an admin product', async (): Promise<void> => {
  const category = createCategory('category-1', 'Lunch');
  const product = createProduct('product-1', 0, category);
  product.isPromotional = true;
  product.promotionalPrice = '9.00';
  product.promotionStartDate = new Date('2026-05-07T12:00:00.000Z');
  product.promotionEndDate = new Date('2026-05-08T12:00:00.000Z');
  const em = new FakeEntityManager([product], [category]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update(
    'product-1',
    {
      isPromotional: false,
      promotionalPrice: 7,
      promotionStartDate: '2026-05-09T12:00:00.000Z',
      promotionEndDate: '2026-05-10T12:00:00.000Z',
    },
    context,
  );

  assert.equal(product.isPromotional, false);
  assert.equal(product.promotionalPrice, undefined);
  assert.equal(product.promotionStartDate, undefined);
  assert.equal(product.promotionEndDate, undefined);
  assert.equal(em.flushCalls, 1);
  assert.equal(result.status, 'updated');
});

test('returns product-not-found without flushing when updating a missing admin product', async (): Promise<void> => {
  const category = createCategory('category-1', 'Lunch');
  const em = new FakeEntityManager([], [category]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update(
    'missing-product',
    { name: 'Missing', categoryId: 'category-1' },
    context,
  );

  assert.deepEqual(result, { status: 'product-not-found' });
  assert.deepEqual(em.findOneCalls, [
    { entity: Product, where: { id: 'missing-product' }, options: { populate: ['category'] } },
  ]);
  assert.equal(em.flushCalls, 0);
});

test('returns category-not-found without flushing when updating to a missing category', async (): Promise<void> => {
  const category = createCategory('category-1', 'Lunch');
  const product = createProduct('product-1', 0, category);
  const em = new FakeEntityManager([product], [category]);
  const repository = new MikroOrmAdminProductWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update(
    'product-1',
    { categoryId: 'missing-category' },
    context,
  );

  assert.deepEqual(result, { status: 'category-not-found', categoryId: 'missing-category' });
  assert.deepEqual(em.findOneCalls, [
    { entity: Product, where: { id: 'product-1' }, options: { populate: ['category'] } },
    { entity: Category, where: { id: 'missing-category' } },
  ]);
  assert.equal(product.category, category);
  assert.equal(em.flushCalls, 0);
});

function createProduct(id: string, sortOrder: number, category = createCategory('category-1', 'Lunch')): Product {
  const product = new Product();
  product.id = id;
  product.category = category;
  product.name = `Product ${id}`;
  product.price = '10.00';
  product.sortOrder = sortOrder;

  return product;
}

function createCategory(id: string, name: string): Category {
  const category = new Category();
  category.id = id;
  category.name = name;

  return category;
}

type FindOneCall = {
  readonly entity: typeof Category | typeof Product;
  readonly options?: { readonly populate: readonly string[] };
  readonly where: { readonly id: string };
};

type FindCall = {
  readonly entity: typeof Product;
  readonly where: { readonly isFeatured: boolean };
};

type ProductCreateData = {
  readonly category: Category;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly isCompound: boolean;
  readonly isRedeemable: boolean;
  readonly name: string;
  readonly price: string;
  readonly redemptionCost: number;
};

type CreateCall = {
  readonly data: ProductCreateData;
  readonly entity: typeof Product;
};

class FakeEntityManager {
  public readonly createCalls: CreateCall[] = [];
  public readonly createdProducts: Product[] = [];
  public readonly findCalls: FindCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls = 0;

  public constructor(
    private readonly products: readonly Product[],
    private readonly categories: readonly Category[] = [],
  ) {}

  public async findOne(
    entity: typeof Category | typeof Product,
    where: { readonly id: string },
    options?: { readonly populate: readonly string[] },
  ): Promise<Category | Product | null> {
    this.findOneCalls.push(options ? { entity, where, options } : { entity, where });

    if (entity === Category) {
      return this.categories.find((category) => category.id === where.id) ?? null;
    }

    return this.products.find((product) => product.id === where.id) ?? null;
  }

  public async find(
    entity: typeof Product,
    where: { readonly isFeatured: boolean },
  ): Promise<readonly Product[]> {
    this.findCalls.push({ entity, where });

    return this.products.filter((product) => product.isFeatured === where.isFeatured);
  }

  public create(entity: typeof Product, data: ProductCreateData): Product {
    this.createCalls.push({ entity, data });

    const product = createProduct(`created-product-${this.createCalls.length}`, 0, data.category);
    product.name = data.name;
    product.price = data.price;
    product.description = data.description;
    product.imageUrl = data.imageUrl;
    product.isCompound = data.isCompound;
    product.isRedeemable = data.isRedeemable;
    product.redemptionCost = data.redemptionCost;
    this.createdProducts.push(product);

    return product;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}
