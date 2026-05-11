import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminProductNotFoundError } from '../../../src/modules/admin/application/errors/admin-product.errors';
import type { AdminProductReadRepository } from '../../../src/modules/admin/application/ports/admin-product.read-repository.port';
import type { AdminFeaturedProductReadModel } from '../../../src/modules/admin/application/read-models/admin-featured-product.read-model';
import type { AdminOptionGroupReadModel } from '../../../src/modules/admin/application/read-models/admin-option-group.read-model';
import type { AdminProductExtraListReadModel } from '../../../src/modules/admin/application/read-models/admin-product-extra.read-model';
import type { AdminProductReadModel } from '../../../src/modules/admin/application/read-models/admin-product.read-model';
import { ListAdminOptionGroupsUseCase } from '../../../src/modules/admin/application/use-cases/list-admin-option-groups.use-case';

test('lists admin option groups through the read repository', async (): Promise<void> => {
  const optionGroups: AdminOptionGroupReadModel[] = [createOptionGroupReadModel('group-1')];
  const repository = new FakeAdminProductReadRepository(optionGroups);
  const useCase = new ListAdminOptionGroupsUseCase(repository);

  const result = await useCase.execute({ productId: 'product-1' });

  assert.equal(result, optionGroups);
  assert.deepEqual(repository.listOptionGroupsCalls, ['product-1']);
});

test('throws an application error when listing option groups for a missing product', async (): Promise<void> => {
  const repository = new FakeAdminProductReadRepository(null);
  const useCase = new ListAdminOptionGroupsUseCase(repository);

  await assert.rejects(
    () => useCase.execute({ productId: 'missing-product' }),
    (error: unknown): boolean =>
      error instanceof AdminProductNotFoundError &&
      error.message === 'Product missing-product not found',
  );

  assert.deepEqual(repository.listOptionGroupsCalls, ['missing-product']);
});

function createOptionGroupReadModel(id: string): AdminOptionGroupReadModel {
  return {
    id,
    name: 'Carne',
    minSelections: 1,
    maxSelections: 2,
    sortOrder: 0,
    isActive: true,
    options: [
      {
        id: 'option-1',
        name: 'Bife',
        price: 5,
        imageUrl: undefined,
        sortOrder: 0,
        isActive: true,
      },
    ],
  };
}

class FakeAdminProductReadRepository implements AdminProductReadRepository {
  public readonly listOptionGroupsCalls: string[] = [];

  public constructor(private readonly optionGroups: readonly AdminOptionGroupReadModel[] | null) {}

  public async list(): Promise<readonly AdminProductReadModel[]> {
    return [];
  }

  public async listExtras(_productId: string): Promise<readonly AdminProductExtraListReadModel[] | null> {
    return [];
  }

  public async listFeatured(): Promise<readonly AdminFeaturedProductReadModel[]> {
    return [];
  }

  public async listOptionGroups(productId: string): Promise<readonly AdminOptionGroupReadModel[] | null> {
    this.listOptionGroupsCalls.push(productId);

    return this.optionGroups;
  }
}
