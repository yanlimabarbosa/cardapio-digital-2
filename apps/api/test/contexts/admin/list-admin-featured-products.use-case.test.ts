import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminProductReadRepository } from '../../../src/modules/admin/application/ports/admin-product.read-repository.port';
import type { AdminFeaturedProductReadModel } from '../../../src/modules/admin/application/read-models/admin-featured-product.read-model';
import type { AdminOptionGroupReadModel } from '../../../src/modules/admin/application/read-models/admin-option-group.read-model';
import type { AdminProductExtraListReadModel } from '../../../src/modules/admin/application/read-models/admin-product-extra.read-model';
import type { AdminProductReadModel } from '../../../src/modules/admin/application/read-models/admin-product.read-model';
import { ListAdminFeaturedProductsUseCase } from '../../../src/modules/admin/application/use-cases/list-admin-featured-products.use-case';

test('lists admin featured products through the read repository', async (): Promise<void> => {
  const products: AdminFeaturedProductReadModel[] = [createFeaturedProductReadModel('product-1')];
  const repository = new FakeAdminProductReadRepository(products);
  const useCase = new ListAdminFeaturedProductsUseCase(repository);

  const result = await useCase.execute();

  assert.equal(result, products);
  assert.equal(repository.listFeaturedCalls, 1);
});

function createFeaturedProductReadModel(id: string): AdminFeaturedProductReadModel {
  return {
    id,
    name: 'Quentinha',
    price: 17,
    imageUrl: '/uploads/quentinha.webp',
    categoryName: 'Lunch',
    featuredOrder: 1,
  };
}

class FakeAdminProductReadRepository implements AdminProductReadRepository {
  public listCalls = 0;
  public listFeaturedCalls = 0;

  public constructor(private readonly featuredProducts: readonly AdminFeaturedProductReadModel[]) {}

  public async list(): Promise<readonly AdminProductReadModel[]> {
    this.listCalls += 1;

    return [];
  }

  public async listExtras(_productId: string): Promise<readonly AdminProductExtraListReadModel[] | null> {
    return [];
  }

  public async listFeatured(): Promise<readonly AdminFeaturedProductReadModel[]> {
    this.listFeaturedCalls += 1;

    return this.featuredProducts;
  }

  public async listOptionGroups(_productId: string): Promise<readonly AdminOptionGroupReadModel[] | null> {
    return [];
  }
}
