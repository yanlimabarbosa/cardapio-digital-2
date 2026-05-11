import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
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
import { AdminProductNotFoundError } from '../../../src/modules/admin/application/errors/admin-product.errors';
import { DeleteAdminProductUseCase } from '../../../src/modules/admin/application/use-cases/delete-admin-product.use-case';

test('soft-deletes an admin product inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductWriteRepository(true);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminProductUseCase(repository, unitOfWork);

  const result = await useCase.execute({ id: 'product-1' });

  assert.deepEqual(result, { success: true });
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'product-1', context }]);
});

test('throws an application error when the admin product does not exist', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductWriteRepository(false);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminProductUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-product' }),
    (error: unknown): boolean =>
      error instanceof AdminProductNotFoundError &&
      error.message === 'Product missing-product not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'missing-product', context }]);
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

  public readonly softDeleteCalls: Array<{
    readonly id: string;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly softDeleteResult: boolean) {}

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

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    this.softDeleteCalls.push({ id, context });

    return this.softDeleteResult;
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
