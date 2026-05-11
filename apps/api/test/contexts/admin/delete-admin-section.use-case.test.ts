import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminSectionNotFoundError } from '../../../src/modules/admin/application/errors/admin-section.errors';
import type {
  AdminSectionCreateMutationModel,
  AdminSectionMutationModel,
  AdminSectionWriteRepository,
  CreateAdminSectionData,
  ReorderAdminSectionItem,
  SetAdminSectionProductsResult,
  UpdateAdminSectionData,
} from '../../../src/modules/admin/application/ports/admin-section-write.repository.port';
import { DeleteAdminSectionUseCase } from '../../../src/modules/admin/application/use-cases/delete-admin-section.use-case';

test('deletes an admin section inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminSectionWriteRepository(true);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminSectionUseCase(repository, unitOfWork);

  const result = await useCase.execute({ id: 'section-1' });

  assert.deepEqual(result, { success: true });
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.deleteCalls, [{ id: 'section-1', context }]);
});

test('throws an application error when deleting a missing admin section', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminSectionWriteRepository(false);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminSectionUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-section' }),
    (error: unknown): boolean =>
      error instanceof AdminSectionNotFoundError &&
      error.message === 'Section missing-section not found',
  );
  assert.deepEqual(repository.deleteCalls, [{ id: 'missing-section', context }]);
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
  public readonly createCalls: Array<{
    readonly data: CreateAdminSectionData;
    readonly context: TransactionContext;
  }> = [];

  public readonly deleteCalls: Array<{
    readonly id: string;
    readonly context: TransactionContext;
  }> = [];

  public readonly updateCalls: Array<{
    readonly id: string;
    readonly data: UpdateAdminSectionData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly deleteResult: boolean) {}

  public async create(
    data: CreateAdminSectionData,
    context: TransactionContext,
  ): Promise<AdminSectionCreateMutationModel> {
    this.createCalls.push({ data, context });

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

  public async delete(id: string, context: TransactionContext): Promise<boolean> {
    this.deleteCalls.push({ id, context });

    return this.deleteResult;
  }

  public async reorder(
    _items: readonly ReorderAdminSectionItem[],
    _context: TransactionContext,
  ): Promise<void> {}

  public async setProducts(
    _sectionId: string,
    _productIds: readonly string[],
    _context: TransactionContext,
  ): Promise<SetAdminSectionProductsResult> {
    return { status: 'success' };
  }

  public async update(
    id: string,
    data: UpdateAdminSectionData,
    context: TransactionContext,
  ): Promise<AdminSectionMutationModel | null> {
    this.updateCalls.push({ id, data, context });

    return null;
  }
}
