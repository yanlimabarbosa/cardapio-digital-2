import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminGroupOptionNotFoundError } from '../../../src/modules/admin/application/errors/admin-product-extra.errors';
import type {
  AdminProductExtraWriteRepository,
  CreateAdminGroupOptionOutcome,
  CreateAdminProductExtraData,
  CreateAdminProductExtraOutcome,
  ReorderAdminProductExtraItem,
  UpdateAdminProductExtraData,
  UpdateAdminProductExtraOutcome,
} from '../../../src/modules/admin/application/ports/admin-product-extra-write.repository.port';
import { DeleteAdminGroupOptionUseCase } from '../../../src/modules/admin/application/use-cases/delete-admin-group-option.use-case';

test('soft-deletes an admin group option inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductExtraWriteRepository(true);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminGroupOptionUseCase(repository, unitOfWork);

  const result = await useCase.execute({ id: 'option-1' });

  assert.deepEqual(result, { success: true });
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'option-1', context }]);
});

test('throws an application error when deleting a missing group option', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductExtraWriteRepository(false);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminGroupOptionUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-option' }),
    (error: unknown): boolean =>
      error instanceof AdminGroupOptionNotFoundError &&
      error.message === 'Group option missing-option not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'missing-option', context }]);
});

class FakeUnitOfWork implements UnitOfWork {
  public runCalls = 0;

  public constructor(private readonly context: TransactionContext) {}

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runCalls += 1;

    return work(this.context);
  }
}

class FakeAdminProductExtraWriteRepository implements AdminProductExtraWriteRepository {
  public readonly softDeleteCalls: Array<{
    readonly id: string;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly softDeleteResult: boolean) {}

  public async create(
    _productId: string,
    _data: CreateAdminProductExtraData,
    _context: TransactionContext,
  ): Promise<CreateAdminProductExtraOutcome> {
    throw new Error('Unexpected create call');
  }

  public async createForOptionGroup(
    _groupId: string,
    _data: CreateAdminProductExtraData,
    _context: TransactionContext,
  ): Promise<CreateAdminGroupOptionOutcome> {
    throw new Error('Unexpected createForOptionGroup call');
  }

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    this.softDeleteCalls.push({ id, context });

    return this.softDeleteResult;
  }

  public async reorder(
    _items: readonly ReorderAdminProductExtraItem[],
    _context: TransactionContext,
  ): Promise<void> {
    throw new Error('Unexpected reorder call');
  }

  public async update(
    _id: string,
    _data: UpdateAdminProductExtraData,
    _context: TransactionContext,
  ): Promise<UpdateAdminProductExtraOutcome> {
    throw new Error('Unexpected update call');
  }
}
