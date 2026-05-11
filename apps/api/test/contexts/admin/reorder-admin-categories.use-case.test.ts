import assert from 'node:assert/strict';
import test from 'node:test';
import type { TransactionContext, TransactionWork, UnitOfWork } from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminCategoryMutationModel,
  AdminCategoryWriteRepository,
  CreateAdminCategoryData,
  ReorderAdminCategoryItem,
  UpdateAdminCategoryData,
} from '../../../src/modules/admin/application/ports/admin-category-write.repository.port';
import { ReorderAdminCategoriesUseCase } from '../../../src/modules/admin/application/use-cases/reorder-admin-categories.use-case';

test('reorders admin categories inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminCategoryWriteRepository();
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new ReorderAdminCategoriesUseCase(repository, unitOfWork);
  const items: readonly ReorderAdminCategoryItem[] = [
    { id: 'category-1', sortOrder: 2 },
    { id: 'category-2', sortOrder: 1 },
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

class FakeAdminCategoryWriteRepository implements AdminCategoryWriteRepository {
  public readonly reorderCalls: Array<{
    readonly items: readonly ReorderAdminCategoryItem[];
    readonly context: TransactionContext;
  }> = [];

  public async reorder(
    items: readonly ReorderAdminCategoryItem[],
    context: TransactionContext,
  ): Promise<void> {
    this.reorderCalls.push({ items, context });
  }

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

  public async softDelete(_id: string, _context: TransactionContext): Promise<boolean> {
    return true;
  }

  public async update(
    _id: string,
    _data: UpdateAdminCategoryData,
    _context: TransactionContext,
  ): Promise<AdminCategoryMutationModel | null> {
    return null;
  }
}
