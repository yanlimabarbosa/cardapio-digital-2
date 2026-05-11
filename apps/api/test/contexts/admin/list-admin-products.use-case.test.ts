import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminProductReadRepository } from '../../../src/modules/admin/application/ports/admin-product.read-repository.port';
import type { AdminFeaturedProductReadModel } from '../../../src/modules/admin/application/read-models/admin-featured-product.read-model';
import type { AdminOptionGroupReadModel } from '../../../src/modules/admin/application/read-models/admin-option-group.read-model';
import type { AdminProductExtraListReadModel } from '../../../src/modules/admin/application/read-models/admin-product-extra.read-model';
import type { AdminProductReadModel } from '../../../src/modules/admin/application/read-models/admin-product.read-model';
import { ListAdminProductsUseCase } from '../../../src/modules/admin/application/use-cases/list-admin-products.use-case';

test('lists admin products through the read repository', async (): Promise<void> => {
  const products: AdminProductReadModel[] = [createProductReadModel('product-1')];
  const repository = new FakeAdminProductReadRepository(products);
  const useCase = new ListAdminProductsUseCase(repository);

  const result = await useCase.execute();

  assert.equal(result, products);
  assert.equal(repository.listCalls, 1);
});

function createProductReadModel(id: string): AdminProductReadModel {
  return {
    id,
    name: 'Quentinha',
    description: 'Lunch',
    price: 17,
    imageUrl: '/uploads/quentinha.webp',
    isActive: true,
    isCompound: false,
    categoryId: 'category-1',
    categoryName: 'Lunch',
    extras: [],
    optionGroups: [],
    sortOrder: 1,
    isRedeemable: false,
    redemptionCost: 0,
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
  };
}

class FakeAdminProductReadRepository implements AdminProductReadRepository {
  public listCalls = 0;

  public constructor(private readonly products: readonly AdminProductReadModel[]) {}

  public async list(): Promise<readonly AdminProductReadModel[]> {
    this.listCalls += 1;

    return this.products;
  }

  public async listExtras(_productId: string): Promise<readonly AdminProductExtraListReadModel[] | null> {
    return [];
  }

  public async listFeatured(): Promise<readonly AdminFeaturedProductReadModel[]> {
    return [];
  }

  public async listOptionGroups(_productId: string): Promise<readonly AdminOptionGroupReadModel[] | null> {
    return [];
  }
}
