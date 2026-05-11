import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Category } from '../../../src/entities';
import { MikroOrmAdminCategoryReadRepository } from '../../../src/modules/admin/adapters/persistence/mikro-orm-admin-category.read-repository';

test('maps admin categories without leaking ORM collections', async (): Promise<void> => {
  const createdAt = new Date('2026-05-07T12:00:00.000Z');
  const category = createCategory({ createdAt });
  const em = new FakeEntityManager([category]);
  const repository = new MikroOrmAdminCategoryReadRepository(em as unknown as EntityManager);

  const result = await repository.list();

  assert.deepEqual(em.findCalls, [
    {
      entity: Category,
      where: {},
      options: {
        orderBy: { sortOrder: 'ASC' },
        populate: ['products'],
      },
    },
  ]);
  assert.deepEqual(result, [
    {
      id: 'category-1',
      name: 'Pratos',
      description: 'Pratos principais',
      imageUrl: '/uploads/pratos.webp',
      sortOrder: 0,
      isActive: true,
      availabilitySchedule: null,
      productCount: 0,
      createdAt,
    },
  ]);
});

type CreateCategoryOptions = {
  readonly createdAt: Date;
};

function createCategory(options: CreateCategoryOptions): Category {
  const category = new Category();
  category.id = 'category-1';
  category.name = 'Pratos';
  category.description = 'Pratos principais';
  category.imageUrl = '/uploads/pratos.webp';
  category.sortOrder = undefined;
  category.isActive = undefined;
  category.availabilitySchedule = undefined;
  category.createdAt = options.createdAt;

  return category;
}

type FindCall = {
  readonly entity: typeof Category;
  readonly options: unknown;
  readonly where: Record<string, never>;
};

class FakeEntityManager {
  public readonly findCalls: FindCall[] = [];

  public constructor(private readonly categories: readonly Category[]) {}

  public async find(
    entity: typeof Category,
    where: Record<string, never>,
    options: unknown,
  ): Promise<readonly Category[]> {
    this.findCalls.push({ entity, where, options });
    return this.categories;
  }
}
