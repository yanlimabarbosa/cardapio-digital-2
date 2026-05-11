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
  UpdateAdminCategoryNotFoundError,
  UpdateAdminCategoryUseCase,
} from '../../../src/modules/admin/application/use-cases/update-admin-category.use-case';

test('updates an admin category inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const category = createMutationModel('category-1');
  const repository = new FakeAdminCategoryWriteRepository(category);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminCategoryUseCase(repository, unitOfWork);
  const data: UpdateAdminCategoryData = {
    name: 'Updated',
    sortOrder: 3,
    isActive: false,
    availabilitySchedule: { 1: [{ start: '09:00', end: '18:00' }] },
  };

  const result = await useCase.execute({ id: 'category-1', ...data });

  assert.equal(result, category);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [{ id: 'category-1', data, context }]);
});

test('throws an application error when the admin category does not exist', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminCategoryWriteRepository(null);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminCategoryUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-category', name: 'Missing' }),
    (error: unknown): boolean =>
      error instanceof UpdateAdminCategoryNotFoundError &&
      error.message === 'Category missing-category not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [
    { id: 'missing-category', data: { name: 'Missing' }, context },
  ]);
});

function createMutationModel(id: string): AdminCategoryMutationModel {
  return {
    id,
    name: 'Category',
    description: 'Description',
    imageUrl: '/uploads/category.webp',
    sortOrder: 1,
    isActive: true,
    availabilitySchedule: null,
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

class FakeAdminCategoryWriteRepository implements AdminCategoryWriteRepository {
  public readonly reorderCalls: Array<{
    readonly items: readonly ReorderAdminCategoryItem[];
    readonly context: TransactionContext;
  }> = [];

  public readonly softDeleteCalls: Array<{
    readonly id: string;
    readonly context: TransactionContext;
  }> = [];

  public readonly updateCalls: Array<{
    readonly id: string;
    readonly data: UpdateAdminCategoryData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly updateResult: AdminCategoryMutationModel | null) {}

  public async create(
    _data: CreateAdminCategoryData,
    _context: TransactionContext,
  ): Promise<AdminCategoryMutationModel> {
    return createMutationModel('category-1');
  }

  public async reorder(
    items: readonly ReorderAdminCategoryItem[],
    context: TransactionContext,
  ): Promise<void> {
    this.reorderCalls.push({ items, context });
  }

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    this.softDeleteCalls.push({ id, context });

    return true;
  }

  public async update(
    id: string,
    data: UpdateAdminCategoryData,
    context: TransactionContext,
  ): Promise<AdminCategoryMutationModel | null> {
    this.updateCalls.push({ id, data, context });

    return this.updateResult;
  }
}
