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
import { AdminProductCategoryNotFoundError } from '../../../src/modules/admin/application/errors/admin-product.errors';
import { CreateAdminProductUseCase } from '../../../src/modules/admin/application/use-cases/create-admin-product.use-case';

test('creates an admin product inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const product = createMutationModel('product-1');
  const repository = new FakeAdminProductWriteRepository({ status: 'created', product });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminProductUseCase(repository, unitOfWork);
  const data: CreateAdminProductData = {
    name: 'New product',
    categoryId: 'category-1',
    price: 17.5,
    description: 'Description',
    imageUrl: '/uploads/product.webp',
    isCompound: true,
    isRedeemable: true,
    redemptionCost: 10,
  };

  const result = await useCase.execute(data);

  assert.equal(result, product);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.createCalls, [{ data, context }]);
});

test('throws an application error when the target category does not exist', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductWriteRepository({
    status: 'category-not-found',
    categoryId: 'missing-category',
  });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminProductUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ name: 'Missing', categoryId: 'missing-category', price: 17.5 }),
    (error: unknown): boolean =>
      error instanceof AdminProductCategoryNotFoundError &&
      error.message === 'Category missing-category not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.createCalls, [
    { data: { name: 'Missing', categoryId: 'missing-category', price: 17.5 }, context },
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
    sortOrder: 0,
    isActive: true,
    isFeatured: false,
    featuredOrder: 0,
    isPromotional: false,
    promotionalPrice: undefined,
    promotionStartDate: undefined,
    promotionEndDate: undefined,
    isCompound: true,
    isRedeemable: true,
    redemptionCost: 10,
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
  public readonly createCalls: Array<{
    readonly data: CreateAdminProductData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly createOutcome: CreateAdminProductOutcome) {}

  public async create(
    data: CreateAdminProductData,
    context: TransactionContext,
  ): Promise<CreateAdminProductOutcome> {
    this.createCalls.push({ data, context });

    return this.createOutcome;
  }

  public async reorder(
    _items: readonly ReorderAdminProductItem[],
    _context: TransactionContext,
  ): Promise<void> {}

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
