import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import type { WeeklySchedule } from '@cardapio/shared';
import { Category } from '../../../src/entities';
import { MikroOrmAdminCategoryWriteRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-category-write.repository';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('reorders admin categories through the provided transaction context', async (): Promise<void> => {
  const firstCategory = createCategory('category-1', 0);
  const em = new FakeEntityManager([firstCategory]);
  const repository = new MikroOrmAdminCategoryWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  await repository.reorder(
    [
      { id: 'category-1', sortOrder: 2 },
      { id: 'missing-category', sortOrder: 1 },
    ],
    context,
  );

  assert.deepEqual(em.findOneCalls, [
    { entity: Category, where: { id: 'category-1' } },
    { entity: Category, where: { id: 'missing-category' } },
  ]);
  assert.equal(firstCategory.sortOrder, 2);
  assert.equal(em.flushCalls, 1);
});

test('creates an admin category through the provided transaction context', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminCategoryWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.create(
    {
      name: 'New category',
      description: 'Description',
      imageUrl: '/uploads/new.webp',
      availabilitySchedule: {
        2: [
          { start: '18:00', end: '21:00' },
          { start: '09:00', end: '12:00' },
          { start: '20:00', end: '22:00' },
          { start: '22:00', end: '21:00' },
        ],
      },
    },
    context,
  );

  assert.equal(em.createCalls.length, 1);
  assert.deepEqual(em.createCalls[0], {
    entity: Category,
    data: {
      name: 'New category',
      description: 'Description',
      imageUrl: '/uploads/new.webp',
      sortOrder: 0,
      availabilitySchedule: {
        2: [
          { start: '09:00', end: '12:00' },
          { start: '18:00', end: '22:00' },
        ],
      },
    },
  });
  assert.deepEqual(result, {
    id: 'created-category-1',
    name: 'New category',
    description: 'Description',
    imageUrl: '/uploads/new.webp',
    sortOrder: 0,
    isActive: true,
    availabilitySchedule: {
      2: [
        { start: '09:00', end: '12:00' },
        { start: '18:00', end: '22:00' },
      ],
    },
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
    updatedAt: new Date('2026-05-07T12:00:00.000Z'),
  });
  assert.equal(em.flushCalls, 1);
});

test('soft-deletes an admin category through the provided transaction context', async (): Promise<void> => {
  const category = createCategory('category-1', 0);
  category.isActive = true;
  const em = new FakeEntityManager([category]);
  const repository = new MikroOrmAdminCategoryWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.softDelete('category-1', context);

  assert.equal(result, true);
  assert.deepEqual(em.findOneCalls, [{ entity: Category, where: { id: 'category-1' } }]);
  assert.equal(category.isActive, true);
  assert.equal(category.isArchived, true);
  assert.equal(em.flushCalls, 1);
});

test('returns false without flushing when the admin category is missing', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminCategoryWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.softDelete('missing-category', context);

  assert.equal(result, false);
  assert.deepEqual(em.findOneCalls, [{ entity: Category, where: { id: 'missing-category' } }]);
  assert.equal(em.flushCalls, 0);
});

test('updates an admin category through the provided transaction context', async (): Promise<void> => {
  const category = createCategory('category-1', 0);
  category.description = 'Old description';
  category.imageUrl = '/uploads/old.webp';
  category.isActive = true;
  category.availabilitySchedule = null;
  category.createdAt = new Date('2026-05-07T12:00:00.000Z');
  category.updatedAt = new Date('2026-05-07T12:30:00.000Z');
  const em = new FakeEntityManager([category]);
  const repository = new MikroOrmAdminCategoryWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update(
    'category-1',
    {
      name: 'Updated',
      sortOrder: 4,
      isActive: false,
      availabilitySchedule: {
        1: [
          { start: '18:00', end: '21:00' },
          { start: '09:00', end: '12:00' },
          { start: '20:00', end: '22:00' },
          { start: '22:00', end: '21:00' },
        ],
      },
    },
    context,
  );

  assert.deepEqual(em.findOneCalls, [{ entity: Category, where: { id: 'category-1' } }]);
  assert.equal(category.name, 'Updated');
  assert.equal(category.description, 'Old description');
  assert.equal(category.imageUrl, '/uploads/old.webp');
  assert.equal(category.sortOrder, 4);
  assert.equal(category.isActive, false);
  assert.deepEqual(category.availabilitySchedule, {
    1: [
      { start: '09:00', end: '12:00' },
      { start: '18:00', end: '22:00' },
    ],
  });
  assert.deepEqual(result, {
    id: 'category-1',
    name: 'Updated',
    description: 'Old description',
    imageUrl: '/uploads/old.webp',
    sortOrder: 4,
    isActive: false,
    availabilitySchedule: {
      1: [
        { start: '09:00', end: '12:00' },
        { start: '18:00', end: '22:00' },
      ],
    },
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  });
  assert.equal(em.flushCalls, 1);
});

test('returns null without flushing when updating a missing admin category', async (): Promise<void> => {
  const em = new FakeEntityManager([]);
  const repository = new MikroOrmAdminCategoryWriteRepository();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);

  const result = await repository.update('missing-category', { name: 'Missing' }, context);

  assert.equal(result, null);
  assert.deepEqual(em.findOneCalls, [{ entity: Category, where: { id: 'missing-category' } }]);
  assert.equal(em.flushCalls, 0);
});

function createCategory(id: string, sortOrder: number): Category {
  const category = new Category();
  category.id = id;
  category.name = `Category ${id}`;
  category.sortOrder = sortOrder;

  return category;
}

type FindOneCall = {
  readonly entity: typeof Category;
  readonly where: { readonly id: string };
};

type CreateCall = {
  readonly data: {
    readonly availabilitySchedule: WeeklySchedule | null;
    readonly description?: string;
    readonly imageUrl?: string;
    readonly name: string;
    readonly sortOrder: number;
  };
  readonly entity: typeof Category;
};

class FakeEntityManager {
  public readonly createCalls: CreateCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls = 0;

  public constructor(private readonly categories: readonly Category[]) {}

  public create(entity: typeof Category, data: CreateCall['data']): Category {
    this.createCalls.push({ entity, data });
    const category = createCategory(`created-category-${this.createCalls.length}`, data.sortOrder);
    category.name = data.name;
    category.description = data.description;
    category.imageUrl = data.imageUrl;
    category.availabilitySchedule = data.availabilitySchedule;
    category.createdAt = new Date('2026-05-07T12:00:00.000Z');
    category.updatedAt = new Date('2026-05-07T12:00:00.000Z');

    return category;
  }

  public async findOne(entity: typeof Category, where: { readonly id: string }): Promise<Category | null> {
    this.findOneCalls.push({ entity, where });

    return this.categories.find((category) => category.id === where.id) ?? null;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}
