import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminProductExtraNotFoundError } from '../../../src/modules/admin/application/errors/admin-product-extra.errors';
import type {
  AdminProductExtraMutationModel,
  AdminProductExtraWriteRepository,
  CreateAdminGroupOptionOutcome,
  CreateAdminProductExtraData,
  CreateAdminProductExtraOutcome,
  ReorderAdminProductExtraItem,
  UpdateAdminProductExtraData,
  UpdateAdminProductExtraOutcome,
} from '../../../src/modules/admin/application/ports/admin-product-extra-write.repository.port';
import { UpdateAdminProductExtraUseCase } from '../../../src/modules/admin/application/use-cases/update-admin-product-extra.use-case';

test('updates an admin product extra inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const extra = createExtraMutationModel('extra-1');
  const repository = new FakeAdminProductExtraWriteRepository({ status: 'updated', extra });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminProductExtraUseCase(repository, unitOfWork);
  const data: UpdateAdminProductExtraData = {
    name: 'Farofa',
    price: 2.5,
    imageUrl: '/uploads/farofa.webp',
    isActive: false,
  };

  const result = await useCase.execute({ id: 'extra-1', ...data });

  assert.equal(result, extra);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [{ id: 'extra-1', data, context }]);
});

test('omits undefined optional update fields from the repository command', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const extra = createExtraMutationModel('extra-1');
  const repository = new FakeAdminProductExtraWriteRepository({ status: 'updated', extra });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminProductExtraUseCase(repository, unitOfWork);

  await useCase.execute({ id: 'extra-1', name: 'Farofa', price: 2.5 });

  assert.deepEqual(repository.updateCalls, [
    { id: 'extra-1', data: { name: 'Farofa', price: 2.5 }, context },
  ]);
});

test('throws an application error when updating a missing extra', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductExtraWriteRepository({ status: 'extra-not-found' });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminProductExtraUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-extra', name: 'Farofa', price: 2.5 }),
    (error: unknown): boolean =>
      error instanceof AdminProductExtraNotFoundError &&
      error.message === 'Extra missing-extra not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [
    { id: 'missing-extra', data: { name: 'Farofa', price: 2.5 }, context },
  ]);
});

function createExtraMutationModel(id: string): AdminProductExtraMutationModel {
  return {
    id,
    name: 'Farofa',
    price: '2.50',
    imageUrl: '/uploads/farofa.webp',
    sortOrder: 0,
    isActive: true,
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

  public constructor(private readonly updateOutcome: UpdateAdminProductExtraOutcome) {}

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

    return false;
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

    return this.updateOutcome;
  }
}
