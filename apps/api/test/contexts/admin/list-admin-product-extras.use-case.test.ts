import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminProductNotFoundError } from '../../../src/modules/admin/application/errors/admin-product.errors';
import type { AdminProductReadRepository } from '../../../src/modules/admin/application/ports/admin-product.read-repository.port';
import type { AdminFeaturedProductReadModel } from '../../../src/modules/admin/application/read-models/admin-featured-product.read-model';
import type { AdminOptionGroupReadModel } from '../../../src/modules/admin/application/read-models/admin-option-group.read-model';
import type { AdminProductExtraListReadModel } from '../../../src/modules/admin/application/read-models/admin-product-extra.read-model';
import type { AdminProductReadModel } from '../../../src/modules/admin/application/read-models/admin-product.read-model';
import { ListAdminProductExtrasUseCase } from '../../../src/modules/admin/application/use-cases/list-admin-product-extras.use-case';

test('lists admin product extras through the read repository', async (): Promise<void> => {
  const extras: AdminProductExtraListReadModel[] = [createExtraReadModel('extra-1')];
  const repository = new FakeAdminProductReadRepository(extras);
  const useCase = new ListAdminProductExtrasUseCase(repository);

  const result = await useCase.execute({ productId: 'product-1' });

  assert.equal(result, extras);
  assert.deepEqual(repository.listExtrasCalls, ['product-1']);
});

test('throws an application error when listing extras for a missing product', async (): Promise<void> => {
  const repository = new FakeAdminProductReadRepository(null);
  const useCase = new ListAdminProductExtrasUseCase(repository);

  await assert.rejects(
    () => useCase.execute({ productId: 'missing-product' }),
    (error: unknown): boolean =>
      error instanceof AdminProductNotFoundError &&
      error.message === 'Product missing-product not found',
  );

  assert.deepEqual(repository.listExtrasCalls, ['missing-product']);
});

function createExtraReadModel(id: string): AdminProductExtraListReadModel {
  return {
    id,
    name: 'Farofa',
    price: 2.5,
    imageUrl: '/uploads/farofa.webp',
    isActive: true,
  };
}

class FakeAdminProductReadRepository implements AdminProductReadRepository {
  public readonly listExtrasCalls: string[] = [];

  public constructor(private readonly extras: readonly AdminProductExtraListReadModel[] | null) {}

  public async list(): Promise<readonly AdminProductReadModel[]> {
    return [];
  }

  public async listExtras(productId: string): Promise<readonly AdminProductExtraListReadModel[] | null> {
    this.listExtrasCalls.push(productId);

    return this.extras;
  }

  public async listFeatured(): Promise<readonly AdminFeaturedProductReadModel[]> {
    return [];
  }

  public async listOptionGroups(_productId: string): Promise<readonly AdminOptionGroupReadModel[] | null> {
    return [];
  }
}
