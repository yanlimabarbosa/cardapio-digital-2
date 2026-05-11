import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminProductExtraNotFoundError } from '../../../src/modules/admin/application/errors/admin-product-extra.errors';
import type {
  AdminProductExtraWriteRepository,
  CreateAdminGroupOptionOutcome,
  CreateAdminProductExtraData,
  CreateAdminProductExtraOutcome,
  ReorderAdminProductExtraItem,
  UpdateAdminProductExtraData,
  UpdateAdminProductExtraOutcome,
} from '../../../src/modules/admin/application/ports/admin-product-extra-write.repository.port';
import { DeleteAdminProductExtraUseCase } from '../../../src/modules/admin/application/use-cases/delete-admin-product-extra.use-case';

test('soft-deletes an admin product extra inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductExtraWriteRepository(true);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminProductExtraUseCase(repository, unitOfWork);

  const result = await useCase.execute({ id: 'extra-1' });

  assert.deepEqual(result, { success: true });
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'extra-1', context }]);
});

test('throws an application error when deleting a missing extra', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductExtraWriteRepository(false);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new DeleteAdminProductExtraUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-extra' }),
    (error: unknown): boolean =>
      error instanceof AdminProductExtraNotFoundError &&
      error.message === 'Extra missing-extra not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.softDeleteCalls, [{ id: 'missing-extra', context }]);
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
  public readonly createCalls: Array<{
    readonly productId: string;
    readonly data: CreateAdminProductExtraData;
    readonly context: TransactionContext;
  }> = [];

  public readonly softDeleteCalls: Array<{
    readonly id: string;
    readonly context: TransactionContext;
  }> = [];

  public readonly updateCalls: Array<{
    readonly id: string;
    readonly data: UpdateAdminProductExtraData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly softDeleteResult: boolean) {}

  public async create(
    productId: string,
    data: CreateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<CreateAdminProductExtraOutcome> {
    this.createCalls.push({ productId, data, context });

    return { status: 'product-not-found' };
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
    id: string,
    data: UpdateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<UpdateAdminProductExtraOutcome> {
    this.updateCalls.push({ id, data, context });

    return { status: 'extra-not-found' };
  }
}
