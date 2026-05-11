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
import { CreateAdminSectionUseCase } from '../../../src/modules/admin/application/use-cases/create-admin-section.use-case';

test('creates an admin section inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const section = createMutationModel('section-1');
  const repository = new FakeAdminSectionWriteRepository(section);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new CreateAdminSectionUseCase(repository, unitOfWork);
  const data: CreateAdminSectionData = {
    label: 'Lunch',
    emoji: ':)',
    availabilitySchedule: { 1: [{ start: '11:00', end: '15:00' }] },
  };

  const result = await useCase.execute(data);

  assert.equal(result, section);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.createCalls, [{ data, context }]);
});

function createMutationModel(id: string): AdminSectionCreateMutationModel {
  return {
    id,
    label: 'Lunch',
    emoji: ':)',
    sortOrder: 1,
    isActive: true,
    availabilitySchedule: null,
    productCount: 0,
    products: [],
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

class FakeAdminSectionWriteRepository implements AdminSectionWriteRepository {
  public readonly createCalls: Array<{
    readonly data: CreateAdminSectionData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly createResult: AdminSectionCreateMutationModel) {}

  public async create(
    data: CreateAdminSectionData,
    context: TransactionContext,
  ): Promise<AdminSectionCreateMutationModel> {
    this.createCalls.push({ data, context });

    return this.createResult;
  }

  public async delete(_id: string, _context: TransactionContext): Promise<boolean> {
    return false;
  }

  public async reorder(
    _items: readonly ReorderAdminSectionItem[],
    _context: TransactionContext,
  ): Promise<void> {}

  public async setProducts(
    _sectionId: string,
    _productIds: readonly string[],
    _context: TransactionContext,
  ): Promise<SetAdminSectionProductsResult> {
    return { status: 'success' };
  }

  public async update(
    _id: string,
    _data: UpdateAdminSectionData,
    _context: TransactionContext,
  ): Promise<AdminSectionMutationModel | null> {
    return null;
  }
}
