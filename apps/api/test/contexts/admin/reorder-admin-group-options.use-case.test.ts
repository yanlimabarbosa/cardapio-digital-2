import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminProductExtraWriteRepository,
  CreateAdminGroupOptionOutcome,
  CreateAdminProductExtraData,
  CreateAdminProductExtraOutcome,
  ReorderAdminProductExtraItem,
  UpdateAdminProductExtraData,
  UpdateAdminProductExtraOutcome,
} from '../../../src/modules/admin/application/ports/admin-product-extra-write.repository.port';
import { ReorderAdminGroupOptionsUseCase } from '../../../src/modules/admin/application/use-cases/reorder-admin-group-options.use-case';

test('reorders admin group options inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminProductExtraWriteRepository();
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new ReorderAdminGroupOptionsUseCase(repository, unitOfWork);
  const items: ReorderAdminProductExtraItem[] = [
    { id: 'option-2', sortOrder: 0 },
    { id: 'option-1', sortOrder: 1 },
  ];

  const result = await useCase.execute({ items });

  assert.deepEqual(result, { success: true });
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.reorderCalls, [{ items, context }]);
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
  public readonly reorderCalls: Array<{
    readonly items: readonly ReorderAdminProductExtraItem[];
    readonly context: TransactionContext;
  }> = [];

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
    items: readonly ReorderAdminProductExtraItem[],
    context: TransactionContext,
  ): Promise<void> {
    this.reorderCalls.push({ items, context });
  }

  public async update(
    _id: string,
    _data: UpdateAdminProductExtraData,
    _context: TransactionContext,
  ): Promise<UpdateAdminProductExtraOutcome> {
    throw new Error('Unexpected update call');
  }
}
