import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  MenuAvailabilityQuery,
  MenuReadRepository,
  ProductLookupQuery,
} from '../../../src/modules/menu/application/ports/menu-read-repository.port';
import type { MenuReadModel } from '../../../src/modules/menu/application/read-models/menu.read-model';
import type { ProductReadModel } from '../../../src/modules/menu/application/read-models/product.read-model';
import { GetFeaturedProductsUseCase } from '../../../src/modules/menu/application/use-cases/get-featured-products.use-case';
import { GetProductsByIdsUseCase } from '../../../src/modules/menu/application/use-cases/get-products-by-ids.use-case';
import { GetPublicMenuUseCase } from '../../../src/modules/menu/application/use-cases/get-public-menu.use-case';

test('reads public menu through the menu read repository', async (): Promise<void> => {
  const menuReadRepository = new FakeMenuReadRepository();
  const useCase = new GetPublicMenuUseCase(menuReadRepository);

  const result = await useCase.execute({ scheduledFor: '2026-05-06T12:00:00-03:00' });

  assert.deepEqual(result, [sampleCategory]);
  assert.deepEqual(menuReadRepository.calls, [
    {
      method: 'getMenu',
      query: { scheduledFor: '2026-05-06T12:00:00-03:00' },
    },
  ]);
});

type MenuReadCall =
  | {
    readonly method: 'getMenu';
    readonly query: MenuAvailabilityQuery;
  }
  | {
    readonly method: 'getFeaturedProducts';
    readonly query: MenuAvailabilityQuery;
  }
  | {
    readonly method: 'getProductsByIds';
    readonly query: ProductLookupQuery;
  };

test('reads featured products through the menu read repository', async (): Promise<void> => {
  const menuReadRepository = new FakeMenuReadRepository();
  const useCase = new GetFeaturedProductsUseCase(menuReadRepository);

  const result = await useCase.execute({ scheduledFor: '2026-05-06T12:00:00-03:00' });

  assert.deepEqual(result, [sampleProduct]);
  assert.deepEqual(menuReadRepository.calls, [
    {
      method: 'getFeaturedProducts',
      query: { scheduledFor: '2026-05-06T12:00:00-03:00' },
    },
  ]);
});

test('reads products by ids through the menu read repository', async (): Promise<void> => {
  const menuReadRepository = new FakeMenuReadRepository();
  const useCase = new GetProductsByIdsUseCase(menuReadRepository);

  const result = await useCase.execute({
    ids: ['product-1', 'product-2'],
    scheduledFor: '2026-05-06T12:00:00-03:00',
  });

  assert.deepEqual(result, [sampleProduct]);
  assert.deepEqual(menuReadRepository.calls, [
    {
      method: 'getProductsByIds',
      query: {
        ids: ['product-1', 'product-2'],
        scheduledFor: '2026-05-06T12:00:00-03:00',
      },
    },
  ]);
});

class FakeMenuReadRepository implements MenuReadRepository {
  public readonly calls: MenuReadCall[] = [];

  public async getMenu(query: MenuAvailabilityQuery): Promise<readonly MenuReadModel[]> {
    this.calls.push({ method: 'getMenu', query });
    return [sampleCategory];
  }

  public async getFeaturedProducts(query: MenuAvailabilityQuery): Promise<readonly ProductReadModel[]> {
    this.calls.push({ method: 'getFeaturedProducts', query });
    return [sampleProduct];
  }

  public async getProductsByIds(query: ProductLookupQuery): Promise<readonly ProductReadModel[]> {
    this.calls.push({ method: 'getProductsByIds', query });
    return [sampleProduct];
  }
}

const sampleProduct: ProductReadModel = {
  id: 'product-1',
  name: 'Produto',
  price: 10,
  isActive: true,
  isAvailable: true,
  isCompound: false,
  isPromotional: false,
  promotionalPrice: null,
  promotionActive: false,
  effectivePrice: 10,
  extras: [],
};

const sampleCategory: MenuReadModel = {
  id: 'category-1',
  name: 'Categoria',
  availabilitySchedule: null,
  isAvailable: true,
  products: [sampleProduct],
};
