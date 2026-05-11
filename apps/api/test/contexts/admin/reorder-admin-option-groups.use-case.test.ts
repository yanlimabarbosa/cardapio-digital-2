import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminOptionGroupWriteRepository,
  CreateAdminOptionGroupData,
  CreateAdminOptionGroupOutcome,
  ReorderAdminOptionGroupItem,
  UpdateAdminOptionGroupData,
  UpdateAdminOptionGroupOutcome,
} from '../../../src/modules/admin/application/ports/admin-option-group-write.repository.port';
import { ReorderAdminOptionGroupsUseCase } from '../../../src/modules/admin/application/use-cases/reorder-admin-option-groups.use-case';

test('reorders admin option groups inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminOptionGroupWriteRepository();
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new ReorderAdminOptionGroupsUseCase(repository, unitOfWork);
  const items: readonly ReorderAdminOptionGroupItem[] = [
    { id: 'group-1', sortOrder: 2 },
    { id: 'group-2', sortOrder: 1 },
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

class FakeAdminOptionGroupWriteRepository implements AdminOptionGroupWriteRepository {
  public readonly reorderCalls: Array<{
    readonly items: readonly ReorderAdminOptionGroupItem[];
    readonly context: TransactionContext;
  }> = [];

  public async create(
    _productId: string,
    _data: CreateAdminOptionGroupData,
    _context: TransactionContext,
  ): Promise<CreateAdminOptionGroupOutcome> {
    throw new Error('Unexpected create call');
  }

  public async reorder(
    items: readonly ReorderAdminOptionGroupItem[],
    context: TransactionContext,
  ): Promise<void> {
    this.reorderCalls.push({ items, context });
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
