import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import {
  DeliveryAreaAlreadyExistsError,
  DeliveryAreaNotFoundError,
} from '../../../src/modules/delivery-areas/application/errors/delivery-area.errors';
import type {
  CreateDeliveryAreaData,
  CreateDeliveryAreaResult,
  DeleteDeliveryAreaResult,
  DeliveryAreaWriteRepository,
  UpdateDeliveryAreaData,
  UpdateDeliveryAreaResult,
} from '../../../src/modules/delivery-areas/application/ports/delivery-area-write.repository.port';
import { UpdateDeliveryAreaUseCase } from '../../../src/modules/delivery-areas/application/use-cases/update-delivery-area.use-case';

const transactionContext: TransactionContext = { contextName: 'fake' };

test('updates a delivery area inside a unit of work while omitting undefined fields', async (): Promise<void> => {
  const repository = new FakeDeliveryAreaWriteRepository({
    status: 'updated',
    area: {
      id: 'area-1',
      neighborhood: 'Bessa',
      city: 'João Pessoa',
      fee: 12,
      normalizedKey: 'joao pessoa bessa',
      matchNormalizedKeys: ['joao pessoa bessa'],
      isActive: false,
    },
  });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new UpdateDeliveryAreaUseCase(repository, unitOfWork);

  const result = await useCase.execute({
    id: 'area-1',
    city: 'João Pessoa',
    fee: 12,
    isActive: false,
  });

  assert.deepEqual(result, {
    id: 'area-1',
    neighborhood: 'Bessa',
    city: 'João Pessoa',
    fee: 12,
    normalizedKey: 'joao pessoa bessa',
    matchNormalizedKeys: ['joao pessoa bessa'],
    isActive: false,
  });
  assert.equal(unitOfWork.runs, 1);
  assert.deepEqual(repository.updateCalls, [
    {
      id: 'area-1',
      data: {
        city: 'João Pessoa',
        fee: 12,
        isActive: false,
      },
      context: transactionContext,
    },
  ]);
});

test('throws an application error when the delivery area is missing', async (): Promise<void> => {
  const repository = new FakeDeliveryAreaWriteRepository({ status: 'not-found' });
  const useCase = new UpdateDeliveryAreaUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () => useCase.execute({ id: 'missing-area', neighborhood: 'Centro' }),
    DeliveryAreaNotFoundError,
  );
});

test('throws an application error when the normalized key already exists', async (): Promise<void> => {
  const repository = new FakeDeliveryAreaWriteRepository({ status: 'duplicate-normalized-key' });
  const useCase = new UpdateDeliveryAreaUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () => useCase.execute({ id: 'area-1', city: 'Recife', neighborhood: 'Centro' }),
    DeliveryAreaAlreadyExistsError,
  );
});

type UpdateCall = {
  readonly context: TransactionContext;
  readonly data: UpdateDeliveryAreaData;
  readonly id: string;
};

class FakeDeliveryAreaWriteRepository implements DeliveryAreaWriteRepository {
  public readonly updateCalls: UpdateCall[] = [];

  public constructor(private readonly updateResult: UpdateDeliveryAreaResult) {}

  public async create(
    _data: CreateDeliveryAreaData,
    _context: TransactionContext,
  ): Promise<CreateDeliveryAreaResult> {
    throw new Error('create should not be called');
  }

  public async delete(
    _id: string,
    _context: TransactionContext,
  ): Promise<DeleteDeliveryAreaResult> {
    throw new Error('delete should not be called');
  }

  public async update(
    id: string,
    data: UpdateDeliveryAreaData,
    context: TransactionContext,
  ): Promise<UpdateDeliveryAreaResult> {
    this.updateCalls.push({ id, data, context });

    return this.updateResult;
  }
}

class FakeUnitOfWork implements UnitOfWork {
  public runs = 0;

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.runs += 1;

    return work(transactionContext);
  }
}
