import assert from 'node:assert/strict';
import test from 'node:test';
import { ListAdminCategoriesUseCase } from '../../../src/modules/admin/application/use-cases/list-admin-categories.use-case';
import type { AdminCategoryReadRepository } from '../../../src/modules/admin/application/ports/admin-category.read-repository.port';
import type { AdminCategoryReadModel } from '../../../src/modules/admin/application/read-models/admin-category.read-model';

test('lists admin categories through the read repository', async (): Promise<void> => {
  const categories = [createCategoryReadModel()];
  const repository = new FakeAdminCategoryReadRepository(categories);
  const useCase = new ListAdminCategoriesUseCase(repository);

  const result = await useCase.execute();

  assert.equal(result, categories);
  assert.equal(repository.listCalls, 1);
});

function createCategoryReadModel(): AdminCategoryReadModel {
  return {
    id: 'category-1',
    name: 'Pratos',
    description: 'Pratos principais',
    imageUrl: '/uploads/pratos.webp',
    sortOrder: 1,
    isActive: true,
    availabilitySchedule: null,
    productCount: 3,
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
  };
}

class FakeAdminCategoryReadRepository implements AdminCategoryReadRepository {
  public listCalls = 0;

  public constructor(private readonly categories: readonly AdminCategoryReadModel[]) {}

  public async list(): Promise<readonly AdminCategoryReadModel[]> {
    this.listCalls += 1;
    return this.categories;
  }
}
