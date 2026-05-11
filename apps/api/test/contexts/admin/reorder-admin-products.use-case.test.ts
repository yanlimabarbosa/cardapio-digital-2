import assert from 'node:assert/strict';
import test from 'node:test';
import type { TransactionContext, TransactionWork, UnitOfWork } from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminProductActiveState,
  AdminProductMutationModel,
  AdminProductWriteRepository,
  CreateAdminProductData,
  CreateAdminProductOutcome,
  ReorderAdminProductItem,
  UpdateAdminProductData,
  UpdateAdminProductOutcome,
} from '../../../src/modules/admin/application/ports/admin-product-write.repository.port';
import { ReorderAdminProductsUseCase } from '../../../src/modules/admin/application/use-cases/reorder-admin-products.use-case';

test('reorders admin products inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductWriteRepository();
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new ReorderAdminProductsUseCase(repository, unitOfWork);
  const items: readonly ReorderAdminProductItem[] = [
    { id: 'product-1', sortOrder: 2 },
    { id: 'product-2', sortOrder: 1 },
  ];

  const result = await useCase.execute({ items });

  assert.deepEqual(result, { success: true });
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.reorderCalls, [{ items, context }]);
});

class FakeUnitOfWork implements UnitOfWork {
  public runCalls = 0;

  public constructor(private readonly context: TransactionContext) {}

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runCalls += 1;

    return work(this.context);
  }
}

class FakeAdminProductWriteRepository implements AdminProductWriteRepository {
  public readonly reorderCalls: Array<{
    readonly items: readonly ReorderAdminProductItem[];
    readonly context: TransactionContext;
  }> = [];

  public async create(
    data: CreateAdminProductData,
    _context: TransactionContext,
  ): Promise<CreateAdminProductOutcome> {
    return { status: 'created', product: createMutationModel(data.name) };
  }

  public async reorder(
    items: readonly ReorderAdminProductItem[],
    context: TransactionContext,
  ): Promise<void> {
    this.reorderCalls.push({ items, context });
  }

  public async setFeatured(
    _productIds: readonly string[],
    _context: TransactionContext,
  ): Promise<void> {}

  public async softDelete(_id: string, _context: TransactionContext): Promise<boolean> {
    return true;
  }

  public async toggleActive(
    id: string,
    _context: TransactionContext,
  ): Promise<AdminProductActiveState | null> {
    return { id, isActive: true };
  }

  public async update(
    id: string,
    _data: UpdateAdminProductData,
    _context: TransactionContext,
  ): Promise<UpdateAdminProductOutcome> {
    return { status: 'updated', product: createMutationModel(id) };
  }
}

function createMutationModel(id: string): AdminProductMutationModel {
  return {
    id,
    category: { id: 'category-1', name: 'Lunch' },
    name: 'Product',
    description: undefined,
    price: '10.00',
    imageUrl: undefined,
    sortOrder: 0,
    isActive: true,
    isFeatured: false,
    featuredOrder: 0,
    isPromotional: false,
    promotionalPrice: undefined,
    promotionStartDate: undefined,
    promotionEndDate: undefined,
    isCompound: false,
    isRedeemable: false,
    redemptionCost: 0,
    createdAt: undefined,
    updatedAt: undefined,
  };
}
