import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { DeliveryAreaNotFoundError } from '../../../src/modules/delivery-areas/application/errors/delivery-area.errors';
import type {
  CreateDeliveryAreaData,
  CreateDeliveryAreaResult,
  DeleteDeliveryAreaResult,
  DeliveryAreaWriteRepository,
  UpdateDeliveryAreaData,
  UpdateDeliveryAreaResult,
} from '../../../src/modules/delivery-areas/application/ports/delivery-area-write.repository.port';
import { DeleteDeliveryAreaUseCase } from '../../../src/modules/delivery-areas/application/use-cases/delete-delivery-area.use-case';

const transactionContext: TransactionContext = { contextName: 'fake' };

test('deletes a delivery area inside a unit of work', async (): Promise<void> => {
  const repository = new FakeDeliveryAreaWriteRepository({ status: 'deleted' });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new DeleteDeliveryAreaUseCase(repository, unitOfWork);

  await useCase.execute('area-1');

  assert.equal(unitOfWork.runs, 1);
  assert.deepEqual(repository.deleteCalls, [
    {
      id: 'area-1',
      context: transactionContext,
    },
  ]);
});

test('throws an application error when the delivery area is missing', async (): Promise<void> => {
  const repository = new FakeDeliveryAreaWriteRepository({ status: 'not-found' });
  const useCase = new DeleteDeliveryAreaUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () => useCase.execute('missing-area'),
    DeliveryAreaNotFoundError,
  );
});

type DeleteCall = {
  readonly context: TransactionContext;
  readonly id: string;
};

class FakeDeliveryAreaWriteRepository implements DeliveryAreaWriteRepository {
  public readonly deleteCalls: DeleteCall[] = [];

  public constructor(private readonly deleteResult: DeleteDeliveryAreaResult) {}

  public async create(
    _data: CreateDeliveryAreaData,
    _context: TransactionContext,
  ): Promise<CreateDeliveryAreaResult> {
    throw new Error('create should not be called');
  }

  public async delete(
    id: string,
    context: TransactionContext,
  ): Promise<DeleteDeliveryAreaResult> {
    this.deleteCalls.push({ id, context });

    return this.deleteResult;
  }

  public async update(
    _id: string,
    _data: UpdateDeliveryAreaData,
    _context: TransactionContext,
  ): Promise<UpdateDeliveryAreaResult> {
    throw new Error('update should not be called');
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public runs = 0;

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runs += 1;

    return work(transactionContext);
  }
}
