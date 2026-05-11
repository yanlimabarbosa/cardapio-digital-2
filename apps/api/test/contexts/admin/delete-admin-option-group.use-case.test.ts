import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminOptionGroupNotFoundError } from '../../../src/modules/admin/application/errors/admin-option-group.errors';
import type {
  AdminOptionGroupWriteRepository,
  CreateAdminOptionGroupData,
  CreateAdminOptionGroupOutcome,
  ReorderAdminOptionGroupItem,
  UpdateAdminOptionGroupData,
  UpdateAdminOptionGroupOutcome,
} from '../../../src/modules/admin/application/ports/admin-option-group-write.repository.port';
import { DeleteAdminOptionGroupUseCase } from '../../../src/modules/admin/application/use-cases/delete-admin-option-group.use-case';

test('soft-deletes an admin option group inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminOptionGroupWriteRepository(true);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminOptionGroupUseCase(repository, unitOfWork);

  const result = await useCase.execute({ id: 'group-1' });

  assert.deepEqual(result, { success: true });
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'group-1', context }]);
});

test('throws an application error when deleting a missing option group', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminOptionGroupWriteRepository(false);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminOptionGroupUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-group' }),
    (error: unknown): boolean =>
      error instanceof AdminOptionGroupNotFoundError &&
      error.message === 'Option group missing-group not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'missing-group', context }]);
});

class FakeUnitOfWork implements UnitOfWork {
  public runCalls = 0;

  public constructor(private readonly context: TransactionContext) {}

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runCalls += 1;

    return work(this.context);
  }
}

class FakeAdminOptionGroupWriteRepository implements AdminOptionGroupWriteRepository {
  public readonly softDeleteCalls: Array<{
    readonly id: string;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly softDeleteResult: boolean) {}

  public async create(
    _productId: string,
    _data: CreateAdminOptionGroupData,
    _context: TransactionContext,
  ): Promise<CreateAdminOptionGroupOutcome> {
    throw new Error('Unexpected create call');
  }

  public async reorder(
    _items: readonly ReorderAdminOptionGroupItem[],
    _context: TransactionContext,
  ): Promise<void> {
    throw new Error('Unexpected reorder call');
  }

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    this.softDeleteCalls.push({ id, context });

    return this.softDeleteResult;
  }

  public async update(
    _id: string,
    _data: UpdateAdminOptionGroupData,
    _context: TransactionContext,
  ): Promise<UpdateAdminOptionGroupOutcome> {
    throw new Error('Unexpected update call');
  }
}
