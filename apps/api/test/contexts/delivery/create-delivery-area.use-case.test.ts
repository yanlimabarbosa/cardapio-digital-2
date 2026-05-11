import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';
import { DeliveryAreaAlreadyExistsError } from '../../../src/modules/delivery-areas/application/errors/delivery-area.errors';
import type {
  CreateDeliveryAreaData,
  CreateDeliveryAreaResult,
  DeleteDeliveryAreaResult,
  DeliveryAreaWriteRepository,
  UpdateDeliveryAreaData,
  UpdateDeliveryAreaResult,
} from '../../../src/modules/delivery-areas/application/ports/delivery-area-write.repository.port';
import { CreateDeliveryAreaUseCase } from '../../../src/modules/delivery-areas/application/use-cases/create-delivery-area.use-case';

const transactionContext: TransactionContext = { contextName: 'fake' };

test('creates a delivery area inside a unit of work with a normalized key', async (): Promise<void> => {
  const repository = new FakeDeliveryAreaWriteRepository({
    status: 'created',
    area: {
      id: 'area-1',
      neighborhood: 'Bessa',
      city: 'João Pessoa',
      fee: 10,
      normalizedKey: 'joao pessoa bessa',
      isActive: true,
    },
  });
  const unitOfWork = new FakeUnitOfWork();
  const useCase = new CreateDeliveryAreaUseCase(repository, unitOfWork);

  const result = await useCase.execute({
    neighborhood: 'Bessa',
    city: 'João Pessoa',
    fee: 10,
  });

  assert.deepEqual(result, {
    id: 'area-1',
    neighborhood: 'Bessa',
    city: 'João Pessoa',
    fee: 10,
    normalizedKey: 'joao pessoa bessa',
    isActive: true,
  });
  assert.equal(unitOfWork.runs, 1);
  assert.deepEqual(repository.createCalls, [
    {
      data: {
        neighborhood: 'Bessa',
        city: 'João Pessoa',
        fee: 10,
        normalizedKey: 'joao pessoa bessa',
      },
      context: transactionContext,
    },
  ]);
});

test('throws an application error when the normalized key already exists', async (): Promise<void> => {
  const repository = new FakeDeliveryAreaWriteRepository({ status: 'duplicate-normalized-key' });
  const useCase = new CreateDeliveryAreaUseCase(repository, new FakeUnitOfWork());

  await assert.rejects(
    () =>
      useCase.execute({
        neighborhood: 'Centro',
        city: 'Recife',
        fee: 7.5,
      }),
    DeliveryAreaAlreadyExistsError,
  );

  assert.deepEqual(repository.createCalls.map((call) => call.data.normalizedKey), ['recife centro']);
});

type CreateCall = {
  readonly context: TransactionContext;
  readonly data: CreateDeliveryAreaData;
};

class FakeDeliveryAreaWriteRepository implements DeliveryAreaWriteRepository {
  public readonly createCalls: CreateCall[] = [];

  public constructor(private readonly result: CreateDeliveryAreaResult) {}

  public async create(
    data: CreateDeliveryAreaData,
    context: TransactionContext,
  ): Promise<CreateDeliveryAreaResult> {
    this.createCalls.push({ data, context });

    return this.result;
  }

  public async delete(
    _id: string,
    _context: TransactionContext,
  ): Promise<DeleteDeliveryAreaResult> {
    throw new Error('delete should not be called');
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
