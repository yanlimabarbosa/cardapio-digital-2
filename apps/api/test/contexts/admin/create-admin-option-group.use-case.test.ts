import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminOptionGroupValidationError } from '../../../src/modules/admin/application/errors/admin-option-group.errors';
import { AdminProductNotFoundError } from '../../../src/modules/admin/application/errors/admin-product.errors';
import type {
  AdminOptionGroupMutationModel,
  AdminOptionGroupWriteRepository,
  CreateAdminOptionGroupData,
  CreateAdminOptionGroupOutcome,
  ReorderAdminOptionGroupItem,
  UpdateAdminOptionGroupData,
  UpdateAdminOptionGroupOutcome,
} from '../../../src/modules/admin/application/ports/admin-option-group-write.repository.port';
import { CreateAdminOptionGroupUseCase } from '../../../src/modules/admin/application/use-cases/create-admin-option-group.use-case';

test('creates an admin option group inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const optionGroup = createOptionGroupMutationModel('group-1');
  const repository = new FakeAdminOptionGroupWriteRepository({ status: 'created', optionGroup });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminOptionGroupUseCase(repository, unitOfWork);
  const data: CreateAdminOptionGroupData = {
    name: 'Carne',
    minSelections: 1,
    maxSelections: 2,
    sortOrder: 0,
  };

  const result = await useCase.execute({ productId: 'product-1', ...data });

  assert.equal(result, optionGroup);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.createCalls, [{ productId: 'product-1', data, context }]);
});

test('defaults optional selection bounds before creating an option group', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const optionGroup = createOptionGroupMutationModel('group-1');
  const repository = new FakeAdminOptionGroupWriteRepository({ status: 'created', optionGroup });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminOptionGroupUseCase(repository, unitOfWork);

  await useCase.execute({ productId: 'product-1', name: 'Carne' });

  assert.deepEqual(repository.createCalls, [
    {
      productId: 'product-1',
      data: { name: 'Carne', minSelections: 0, maxSelections: 1 },
      context,
    },
  ]);
});

test('throws an application error when creating an option group for a missing product', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminOptionGroupWriteRepository({ status: 'product-not-found' });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminOptionGroupUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ productId: 'missing-product', name: 'Carne' }),
    (error: unknown): boolean =>
      error instanceof AdminProductNotFoundError &&
      error.message === 'Product missing-product not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.createCalls, [
    {
      productId: 'missing-product',
      data: { name: 'Carne', minSelections: 0, maxSelections: 1 },
      context,
    },
  ]);
});

test('rejects invalid selection bounds before opening a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const optionGroup = createOptionGroupMutationModel('group-1');
  const repository = new FakeAdminOptionGroupWriteRepository({ status: 'created', optionGroup });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminOptionGroupUseCase(repository, unitOfWork);

  await assert.rejects(
    () =>
      useCase.execute({
        productId: 'product-1',
        name: 'Carne',
        minSelections: 3,
        maxSelections: 2,
      }),
    (error: unknown): boolean =>
      error instanceof AdminOptionGroupValidationError &&
      error.message === 'minSelections cannot be greater than maxSelections',
  );

  assert.equal(unitOfWork.runCalls, 0);
  assert.deepEqual(repository.createCalls, []);
});

function createOptionGroupMutationModel(id: string): AdminOptionGroupMutationModel {
  return {
    id,
    combinedLimitId: null,
    allowRepeat: false,
    name: 'Carne',
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
  public readonly createCalls: Array<{
    readonly productId: string;
    readonly data: CreateAdminOptionGroupData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly outcome: CreateAdminOptionGroupOutcome) {}

  public async create(
    productId: string,
    data: CreateAdminOptionGroupData,
    context: TransactionContext,
  ): Promise<CreateAdminOptionGroupOutcome> {
    this.createCalls.push({ productId, data, context });

    return this.outcome;
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
    _id: string,
    _data: UpdateAdminOptionGroupData,
    _context: TransactionContext,
  ): Promise<UpdateAdminOptionGroupOutcome> {
    throw new Error('Unexpected update call');
  }
}
