import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import {
  AdminOptionGroupNotFoundError,
  AdminOptionGroupValidationError,
} from '../../../src/modules/admin/application/errors/admin-option-group.errors';
import type {
  AdminOptionGroupMutationModel,
  AdminOptionGroupWriteRepository,
  CreateAdminOptionGroupData,
  CreateAdminOptionGroupOutcome,
  ReorderAdminOptionGroupItem,
  UpdateAdminOptionGroupData,
  UpdateAdminOptionGroupOutcome,
} from '../../../src/modules/admin/application/ports/admin-option-group-write.repository.port';
import { UpdateAdminOptionGroupUseCase } from '../../../src/modules/admin/application/use-cases/update-admin-option-group.use-case';

test('updates an admin option group inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const optionGroup = createOptionGroupMutationModel('group-1');
  const repository = new FakeAdminOptionGroupWriteRepository({ status: 'updated', optionGroup });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminOptionGroupUseCase(repository, unitOfWork);

  const result = await useCase.execute({
    id: 'group-1',
    name: 'Molhos',
    minSelections: 1,
    maxSelections: 2,
    sortOrder: 0,
    isActive: false,
  });

  assert.equal(result, optionGroup);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [
    {
      id: 'group-1',
      data: {
        name: 'Molhos',
        minSelections: 1,
        maxSelections: 2,
        sortOrder: 0,
        isActive: false,
      },
      context,
    },
  ]);
});

test('omits undefined option group update fields', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const optionGroup = createOptionGroupMutationModel('group-1');
  const repository = new FakeAdminOptionGroupWriteRepository({ status: 'updated', optionGroup });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminOptionGroupUseCase(repository, unitOfWork);

  await useCase.execute({ id: 'group-1', name: 'Molhos' });

  assert.deepEqual(repository.updateCalls, [
    { id: 'group-1', data: { name: 'Molhos' }, context },
  ]);
});

test('throws an application error when updating a missing option group', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminOptionGroupWriteRepository({ status: 'option-group-not-found' });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminOptionGroupUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-group', name: 'Molhos' }),
    (error: unknown): boolean =>
      error instanceof AdminOptionGroupNotFoundError &&
      error.message === 'Option group missing-group not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [
    { id: 'missing-group', data: { name: 'Molhos' }, context },
  ]);
});

test('throws a validation error when the repository rejects selection bounds', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminOptionGroupWriteRepository({
    status: 'invalid-selection-range',
    message: 'minSelections cannot be greater than maxSelections',
  });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminOptionGroupUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'group-1', minSelections: 3 }),
    (error: unknown): boolean =>
      error instanceof AdminOptionGroupValidationError &&
      error.message === 'minSelections cannot be greater than maxSelections',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [
    { id: 'group-1', data: { minSelections: 3 }, context },
  ]);
});

function createOptionGroupMutationModel(id: string): AdminOptionGroupMutationModel {
  return {
    id,
    combinedLimitId: null,
    name: 'Molhos',
    minSelections: 1,
    maxSelections: 2,
    sortOrder: 0,
    isActive: true,
    options: [],
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

class FakeAdminOptionGroupWriteRepository implements AdminOptionGroupWriteRepository {
  public readonly updateCalls: Array<{
    readonly id: string;
    readonly data: UpdateAdminOptionGroupData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly updateOutcome: UpdateAdminOptionGroupOutcome) {}

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

  public async softDelete(_id: string, _context: TransactionContext): Promise<boolean> {
    throw new Error('Unexpected softDelete call');
  }

  public async update(
    id: string,
    data: UpdateAdminOptionGroupData,
    context: TransactionContext,
  ): Promise<UpdateAdminOptionGroupOutcome> {
    this.updateCalls.push({ id, data, context });

    return this.updateOutcome;
  }
}
