import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import {
  AdminSectionNotFoundError,
  AdminSectionProductNotFoundError,
} from '../../../src/modules/admin/application/errors/admin-section.errors';
import type {
  AdminSectionCreateMutationModel,
  AdminSectionMutationModel,
  AdminSectionWriteRepository,
  CreateAdminSectionData,
  ReorderAdminSectionItem,
  SetAdminSectionProductsResult,
  UpdateAdminSectionData,
} from '../../../src/modules/admin/application/ports/admin-section-write.repository.port';
import { SetAdminSectionProductsUseCase } from '../../../src/modules/admin/application/use-cases/set-admin-section-products.use-case';

test('sets admin section products inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminSectionWriteRepository({ status: 'success' });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new SetAdminSectionProductsUseCase(repository, unitOfWork);

  const result = await useCase.execute({
    sectionId: 'section-1',
    productIds: ['product-2', 'product-1'],
  });

  assert.equal(result, undefined);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.setProductsCalls, [
    {
      sectionId: 'section-1',
      productIds: ['product-2', 'product-1'],
      context,
    },
  ]);
});

test('throws an application error when setting products for a missing section', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminSectionWriteRepository({ status: 'section-not-found' });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new SetAdminSectionProductsUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ sectionId: 'missing-section', productIds: ['product-1'] }),
    (error: unknown): boolean =>
      error instanceof AdminSectionNotFoundError &&
      error.message === 'Section missing-section not found',
  );
  assert.deepEqual(repository.setProductsCalls, [
    {
      sectionId: 'missing-section',
      productIds: ['product-1'],
      context,
    },
  ]);
});

test('throws an application error when a requested section product is missing', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminSectionWriteRepository({
    status: 'product-not-found',
    productId: 'missing-product',
  });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new SetAdminSectionProductsUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ sectionId: 'section-1', productIds: ['missing-product'] }),
    (error: unknown): boolean =>
      error instanceof AdminSectionProductNotFoundError &&
      error.productId === 'missing-product' &&
      error.message === 'Product missing-product not found for section products',
  );
  assert.deepEqual(repository.setProductsCalls, [
    {
      sectionId: 'section-1',
      productIds: ['missing-product'],
      context,
    },
  ]);
});

class FakeUnitOfWork implements UnitOfWork {
  public runCalls = 0;

  public constructor(private readonly context: TransactionContext) {}

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runCalls += 1;

    return work(this.context);
  }
}

class FakeAdminSectionWriteRepository implements AdminSectionWriteRepository {
  public readonly setProductsCalls: Array<{
    readonly sectionId: string;
    readonly productIds: readonly string[];
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly setProductsResult: SetAdminSectionProductsResult) {}

  public async create(
    data: CreateAdminSectionData,
    _context: TransactionContext,
  ): Promise<AdminSectionCreateMutationModel> {
    return {
      id: 'created-section',
      label: data.label,
      emoji: data.emoji,
      sortOrder: 0,
      isActive: true,
      availabilitySchedule: data.availabilitySchedule ?? null,
      productCount: 0,
      products: [],
    };
  }

  public async delete(_id: string, _context: TransactionContext): Promise<boolean> {
    return true;
  }

  public async reorder(
    _items: readonly ReorderAdminSectionItem[],
    _context: TransactionContext,
  ): Promise<void> {}

  public async setProducts(
    sectionId: string,
    productIds: readonly string[],
    context: TransactionContext,
  ): Promise<SetAdminSectionProductsResult> {
    this.setProductsCalls.push({ sectionId, productIds, context });

    return this.setProductsResult;
  }

  public async update(
    _id: string,
    _data: UpdateAdminSectionData,
    _context: TransactionContext,
  ): Promise<AdminSectionMutationModel | null> {
    return null;
  }
}
