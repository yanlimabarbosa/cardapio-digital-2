import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { AdminSectionNotFoundError } from '../../../src/modules/admin/application/errors/admin-section.errors';
import type {
  AdminSectionCreateMutationModel,
  AdminSectionMutationModel,
  AdminSectionWriteRepository,
  CreateAdminSectionData,
  ReorderAdminSectionItem,
  SetAdminSectionProductsResult,
  UpdateAdminSectionData,
} from '../../../src/modules/admin/application/ports/admin-section-write.repository.port';
import { UpdateAdminSectionUseCase } from '../../../src/modules/admin/application/use-cases/update-admin-section.use-case';

test('updates an admin section inside a unit of work', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const section = createMutationModel('section-1');
  const repository = new FakeAdminSectionWriteRepository(section);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminSectionUseCase(repository, unitOfWork);
  const data: UpdateAdminSectionData = {
    label: 'Dinner',
    emoji: ':D',
    isActive: false,
    availabilitySchedule: { 2: [{ start: '18:00', end: '22:00' }] },
  };

  const result = await useCase.execute({ id: 'section-1', ...data });

  assert.equal(result, section);
  assert.equal(unitOfWork.runCalls, 1);
  assert.deepEqual(repository.updateCalls, [{ id: 'section-1', data, context }]);
});

test('throws an application error when the admin section does not exist', async (): Promise<void> => {
  const context: TransactionContext = { contextName: 'test-transaction' };
  const repository = new FakeAdminSectionWriteRepository(null);
  const unitOfWork = new FakeUnitOfWork(context);
  const useCase = new UpdateAdminSectionUseCase(repository, unitOfWork);

  await assert.rejects(
    () => useCase.execute({ id: 'missing-section', label: 'Missing' }),
    AdminSectionNotFoundError,
  );
  assert.deepEqual(repository.updateCalls, [
    { id: 'missing-section', data: { label: 'Missing' }, context },
  ]);
});

function createMutationModel(id: string): AdminSectionMutationModel {
  return {
    id,
    label: 'Lunch',
    emoji: ':)',
    sortOrder: 1,
    isActive: true,
    availabilitySchedule: null,
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

  public readonly updateCalls: Array<{
    readonly id: string;
    readonly data: UpdateAdminSectionData;
    readonly context: TransactionContext;
  }> = [];

  public constructor(private readonly updateResult: AdminSectionMutationModel | null) {}

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
    id: string,
    data: UpdateAdminSectionData,
    context: TransactionContext,
  ): Promise<AdminSectionMutationModel | null> {
    this.updateCalls.push({ id, data, context });

    return this.updateResult;
  }
}
