import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminCategoryMutationModel,
  AdminCategoryWriteRepository,
  CreateAdminCategoryData,
  ReorderAdminCategoryItem,
  UpdateAdminCategoryData,
} from '../../../src/modules/admin/application/ports/admin-category-write.repository.port';
import {
  AdminCategoryNotFoundError,
  DeleteAdminCategoryUseCase,
} from '../../../src/modules/admin/application/use-cases/delete-admin-category.use-case';

test('soft-deletes an admin category inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminCategoryWriteRepository(true);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminCategoryUseCase(repository, unitOfWork);

  const result = await useCase.execute({ id: 'category-1' });

  assert.deepEqual(result, { success: true });
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'category-1', context }]);
});

test('throws a domain error when the admin category does not exist', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminCategoryWriteRepository(false);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminCategoryUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-category' }),
    (error: unknown): boolean =>
      error instanceof AdminCategoryNotFoundError &&
      error.message === 'Category missing-category not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'missing-category', context }]);
});

class FakeUnitOfWork implements UnitOfWork {
  public runCalls = 0;

  public constructor(private readonly context: TransactionContext) {}

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runCalls += 1;

    return work(this.context);
  }
}

class FakeAdminCategoryWriteRepository implements AdminCategoryWriteRepository {
  public readonly reorderCalls: Array<{
    readonly items: readonly ReorderAdminCategoryItem[];
    readonly context: TransactionContext;
  }> = [];

  public readonly softDeleteCalls: Array<{
    readonly id: string;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly softDeleteResult: boolean) {}

  public async create(
    _data: CreateAdminCategoryData,
    _context: TransactionContext,
  ): Promise<AdminCategoryMutationModel> {
    return {
      id: 'category-1',
      name: 'Category',
      sortOrder: 0,
      isActive: true,
    };
  }

  public async reorder(
    items: readonly ReorderAdminCategoryItem[],
    context: TransactionContext,
  ): Promise<void> {
    this.reorderCalls.push({ items, context });
  }

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    this.softDeleteCalls.push({ id, context });

    return this.softDeleteResult;
  }

  public async update(
    _id: string,
    _data: UpdateAdminCategoryData,
    _context: TransactionContext,
  ): Promise<AdminCategoryMutationModel | null> {
    return null;
  }
}
