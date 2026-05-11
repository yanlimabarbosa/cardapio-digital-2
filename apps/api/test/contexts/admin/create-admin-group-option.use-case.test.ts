import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminOptionGroupNotFoundError } from '../../../src/modules/admin/application/errors/admin-option-group.errors';
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
import { CreateAdminGroupOptionUseCase } from '../../../src/modules/admin/application/use-cases/create-admin-group-option.use-case';

test('creates an admin group option inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const extra = createExtraMutationModel('option-1');
  const repository = new FakeAdminProductExtraWriteRepository({ status: 'created', extra });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminGroupOptionUseCase(repository, unitOfWork);
  const data: CreateAdminProductExtraData = {
    name: 'Carne',
    price: 3.5,
    imageUrl: '/uploads/carne.webp',
  };

  const result = await useCase.execute({ groupId: 'group-1', ...data });

  assert.equal(result, extra);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.createForOptionGroupCalls, [{ groupId: 'group-1', data, context }]);
});

test('throws an application error when creating an option for a missing group', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductExtraWriteRepository({
    status: 'option-group-not-found',
  });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminGroupOptionUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ groupId: 'missing-group', name: 'Carne', price: 3.5 }),
    (error: unknown): boolean =>
      error instanceof AdminOptionGroupNotFoundError &&
      error.message === 'Option group missing-group not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.createForOptionGroupCalls, [
    { groupId: 'missing-group', data: { name: 'Carne', price: 3.5 }, context },
  ]);
});

function createExtraMutationModel(id: string): AdminProductExtraMutationModel {
  return {
    id,
    name: 'Carne',
    price: '3.50',
    imageUrl: '/uploads/carne.webp',
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
  public readonly createForOptionGroupCalls: Array<{
    readonly groupId: string;
    readonly data: CreateAdminProductExtraData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly outcome: CreateAdminGroupOptionOutcome) {}

  public async create(
    _productId: string,
    _data: CreateAdminProductExtraData,
    _context: TransactionContext,
  ): Promise<CreateAdminProductExtraOutcome> {
    throw new Error('Unexpected create call');
  }

  public async createForOptionGroup(
    groupId: string,
    data: CreateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<CreateAdminGroupOptionOutcome> {
    this.createForOptionGroupCalls.push({ groupId, data, context });

    return this.outcome;
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
    _id: string,
    _data: UpdateAdminProductExtraData,
    _context: TransactionContext,
  ): Promise<UpdateAdminProductExtraOutcome> {
    throw new Error('Unexpected update call');
  }
}
