import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminSectionCreateMutationModel,
  AdminSectionMutationModel,
  AdminSectionWriteRepository,
  CreateAdminSectionData,
  ReorderAdminSectionItem,
  SetAdminSectionProductsResult,
  UpdateAdminSectionData,
} from '../../../src/modules/admin/application/ports/admin-section-write.repository.port';
import { ReorderAdminSectionsUseCase } from '../../../src/modules/admin/application/use-cases/reorder-admin-sections.use-case';

test('reorders admin sections inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminSectionWriteRepository();
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new ReorderAdminSectionsUseCase(repository, unitOfWork);

  const result = await useCase.execute({ ids: ['section-2', 'section-1'] });

  assert.equal(result, undefined);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.reorderCalls, [
    {
      items: [
        { id: 'section-2', sortOrder: 0 },
        { id: 'section-1', sortOrder: 1 },
      ],
      context,
    },
  ]);
});

class FakeUnitOfWork implements UnitOfWork {
  public runCalls = 0;

  public constructor(private readonly context: TransactionContext) {}

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runCalls += 1;

    return work(this.context);
  }
}

class FakeAdminSectionWriteRepository implements AdminSectionWriteRepository {
  public readonly createCalls: Array<{
    readonly data: CreateAdminSectionData;
    readonly context: TransactionContext;
  }> = [];

  public readonly reorderCalls: Array<{
    readonly items: readonly ReorderAdminSectionItem[];
    readonly context: TransactionContext;
  }> = [];

  public readonly updateCalls: Array<{
    readonly id: string;
    readonly data: UpdateAdminSectionData;
    readonly context: TransactionContext;
  }> = [];

  public async create(
    data: CreateAdminSectionData,
    context: TransactionContext,
  ): Promise<AdminSectionCreateMutationModel> {
    this.createCalls.push({ data, context });

    return {
      id: 'created-section',
      label: data.label,
      emoji: data.emoji,
      sortOrder: 0,
      isActive: true,
      availabilitySchedule: data.availabilitySchedule ?? null,
      productCount: 0,
      products: [],
    };
  }

  public async delete(_id: string, _context: TransactionContext): Promise<boolean> {
    return true;
  }

  public async reorder(
    items: readonly ReorderAdminSectionItem[],
    context: TransactionContext,
  ): Promise<void> {
    this.reorderCalls.push({ items, context });
  }

  public async setProducts(
    _sectionId: string,
    _productIds: readonly string[],
    _context: TransactionContext,
  ): Promise<SetAdminSectionProductsResult> {
    return { status: 'success' };
  }

  public async update(
    id: string,
    data: UpdateAdminSectionData,
    context: TransactionContext,
  ): Promise<AdminSectionMutationModel | null> {
    this.updateCalls.push({ id, data, context });

    return null;
  }
}
