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
import {
  AdminProductCategoryNotFoundError,
  AdminProductNotFoundError,
} from '../../../src/modules/admin/application/errors/admin-product.errors';
import { UpdateAdminProductUseCase } from '../../../src/modules/admin/application/use-cases/update-admin-product.use-case';

test('updates an admin product inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const product = createMutationModel('product-1');
  const repository = new FakeAdminProductWriteRepository({ status: 'updated', product });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminProductUseCase(repository, unitOfWork);
  const data: UpdateAdminProductData = {
    name: 'Updated',
    categoryId: 'category-2',
    price: 22,
    isActive: false,
  };

  const result = await useCase.execute({ id: 'product-1', ...data });

  assert.equal(result, product);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [{ id: 'product-1', data, context }]);
});

test('throws an application error when updating a missing admin product', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductWriteRepository({ status: 'product-not-found' });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminProductUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-product', name: 'Missing' }),
    (error: unknown): boolean =>
      error instanceof AdminProductNotFoundError &&
      error.message === 'Product missing-product not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [
    { id: 'missing-product', data: { name: 'Missing' }, context },
  ]);
});

test('throws an application error when the target category does not exist', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductWriteRepository({
    status: 'category-not-found',
    categoryId: 'missing-category',
  });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminProductUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'product-1', categoryId: 'missing-category' }),
    (error: unknown): boolean =>
      error instanceof AdminProductCategoryNotFoundError &&
      error.message === 'Category missing-category not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [
    { id: 'product-1', data: { categoryId: 'missing-category' }, context },
  ]);
});

function createMutationModel(id: string): AdminProductMutationModel {
  return {
    id,
    category: { id: 'category-1', name: 'Lunch' },
    name: 'Product',
    description: 'Description',
    price: '17.50',
    imageUrl: '/uploads/product.webp',
    sortOrder: 1,
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
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
    updatedAt: new Date('2026-05-07T12:30:00.000Z'),
  };
}

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

  public readonly toggleActiveCalls: Array<{
    readonly id: string;
    readonly context: TransactionContext;
  }> = [];

  public readonly createCalls: Array<{
    readonly data: CreateAdminProductData;
    readonly context: TransactionContext;
  }> = [];

  public readonly updateCalls: Array<{
    readonly id: string;
    readonly data: UpdateAdminProductData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly updateOutcome: UpdateAdminProductOutcome) {}

  public async create(
    data: CreateAdminProductData,
    context: TransactionContext,
  ): Promise<CreateAdminProductOutcome> {
    this.createCalls.push({ data, context });

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

    return true;
  }

  public async toggleActive(
    id: string,
    context: TransactionContext,
  ): Promise<AdminProductActiveState | null> {
    this.toggleActiveCalls.push({ id, context });

    return { id, isActive: true };
  }

  public async update(
    id: string,
    data: UpdateAdminProductData,
    context: TransactionContext,
  ): Promise<UpdateAdminProductOutcome> {
    this.updateCalls.push({ id, data, context });

    return this.updateOutcome;
  }
}
