import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminProductNotFoundError } from '../../../src/modules/admin/application/errors/admin-product.errors';
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
import { CreateAdminProductExtraUseCase } from '../../../src/modules/admin/application/use-cases/create-admin-product-extra.use-case';

test('creates an admin product extra inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const extra = createExtraMutationModel('extra-1');
  const repository = new FakeAdminProductExtraWriteRepository({ status: 'created', extra });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminProductExtraUseCase(repository, unitOfWork);
  const data: CreateAdminProductExtraData = {
    name: 'Farofa',
    price: 2.5,
    imageUrl: '/uploads/farofa.webp',
  };

  const result = await useCase.execute({ productId: 'product-1', ...data });

  assert.equal(result, extra);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.createCalls, [{ productId: 'product-1', data, context }]);
});

test('throws an application error when creating an extra for a missing product', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductExtraWriteRepository({ status: 'product-not-found' });
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminProductExtraUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ productId: 'missing-product', name: 'Farofa', price: 2.5 }),
    (error: unknown): boolean =>
      error instanceof AdminProductNotFoundError &&
      error.message === 'Product missing-product not found',
  );

  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.createCalls, [
    { productId: 'missing-product', data: { name: 'Farofa', price: 2.5 }, context },
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

  public constructor(private readonly outcome: CreateAdminProductExtraOutcome) {}

  public async create(
    productId: string,
    data: CreateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<CreateAdminProductExtraOutcome> {
    this.createCalls.push({ productId, data, context });

    return this.outcome;
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

    return { status: 'extra-not-found' };
  }
}
