import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminGroupOptionNotFoundError } from '../../../src/modules/admin/application/errors/admin-product-extra.errors';
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
import { UpdateAdminGroupOptionUseCase } from '../../../src/modules/admin/application/use-cases/update-admin-group-option.use-case';

test('updates an admin group option inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const option = createOptionMutationModel('option-1');
  const repository = new FakeAdminProductExtraWriteRepository({ status: 'updated', extra: option });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminGroupOptionUseCase(repository, unitOfWork);
  const data: UpdateAdminProductExtraData = {
    name: 'Bife',
    price: 3.5,
    imageUrl: '/uploads/bife.webp',
    isActive: false,
  };

  const result = await useCase.execute({ id: 'option-1', ...data });

  assert.equal(result, option);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [{ id: 'option-1', data, context }]);
});

test('omits undefined group option update fields', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const option = createOptionMutationModel('option-1');
  const repository = new FakeAdminProductExtraWriteRepository({ status: 'updated', extra: option });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminGroupOptionUseCase(repository, unitOfWork);

  await useCase.execute({
    id: 'option-1',
    name: 'Bife',
    price: undefined,
    imageUrl: undefined,
    isActive: undefined,
  });

  assert.deepEqual(repository.updateCalls, [
    { id: 'option-1', data: { name: 'Bife' }, context },
  ]);
});

test('throws an application error when updating a missing group option', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductExtraWriteRepository({ status: 'extra-not-found' });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminGroupOptionUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-option', name: 'Bife' }),
    (error: unknown): boolean =>
      error instanceof AdminGroupOptionNotFoundError &&
      error.message === 'Group option missing-option not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [
    { id: 'missing-option', data: { name: 'Bife' }, context },
  ]);
});

function createOptionMutationModel(id: string): AdminProductExtraMutationModel {
  return {
    id,
    name: 'Bife',
    price: '3.50',
    imageUrl: '/uploads/bife.webp',
    sortOrder: 2,
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
  public readonly updateCalls: Array<{
    readonly id: string;
    readonly data: UpdateAdminProductExtraData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly updateOutcome: UpdateAdminProductExtraOutcome) {}

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

  public async softDelete(_id: string, _context: TransactionContext): Promise<boolean> {
    throw new Error('Unexpected softDelete call');
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
