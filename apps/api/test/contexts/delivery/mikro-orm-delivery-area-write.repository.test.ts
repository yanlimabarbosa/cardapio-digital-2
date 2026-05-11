import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { DeliveryArea } from '../../../src/entities';
import { MikroOrmDeliveryAreaWriteRepository } from '../../../src/modules/delivery-areas/adapters/persistence/mikro-orm-delivery-area-write.repository';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';

test('creates a delivery area through the provided transaction context', async (): Promise<void> => {
  const em = new FakeEntityManager();
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmDeliveryAreaWriteRepository();

  const result = await repository.create(
    {
      neighborhood: 'Bessa',
      city: 'João Pessoa',
      fee: 10,
      normalizedKey: 'joao pessoa bessa',
    },
    context,
  );

  assert.deepEqual(em.findOneCalls, [
    {
      entity: DeliveryArea,
      where: { normalizedKey: 'joao pessoa bessa' },
    },
  ]);
  assert.deepEqual(em.createCalls, [
    {
      entity: DeliveryArea,
      data: {
        neighborhood: 'Bessa',
        city: 'João Pessoa',
        fee: '10.00',
        normalizedKey: 'joao pessoa bessa',
      },
    },
  ]);
  assert.equal(em.flushCalls, 1);
  assert.deepEqual(result, {
    status: 'created',
    area: {
      id: 'created-area',
      neighborhood: 'Bessa',
      city: 'João Pessoa',
      fee: 10,
      normalizedKey: 'joao pessoa bessa',
      isActive: true,
    },
  });
});

test('returns duplicate without creating or flushing when the normalized key exists', async (): Promise<void> => {
  const em = new FakeEntityManager([createDeliveryArea('existing-area')]);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmDeliveryAreaWriteRepository();

  const result = await repository.create(
    {
      neighborhood: 'Centro',
      city: 'Recife',
      fee: 7.5,
      normalizedKey: 'recife centro',
    },
    context,
  );

  assert.deepEqual(result, { status: 'duplicate-normalized-key' });
  assert.deepEqual(em.createCalls, []);
  assert.equal(em.flushCalls, 0);
});

test('updates a delivery area through the provided transaction context', async (): Promise<void> => {
  const area = createDeliveryArea('area-1');
  const em = new FakeEntityManager([area, null]);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmDeliveryAreaWriteRepository();

  const result = await repository.update(
    'area-1',
    {
      neighborhood: 'Boa Viagem',
      city: 'Recife',
      fee: 9,
      isActive: false,
    },
    context,
  );

  assert.deepEqual(em.findOneCalls, [
    {
      entity: DeliveryArea,
      where: { id: 'area-1' },
    },
    {
      entity: DeliveryArea,
      where: { normalizedKey: 'recife boa viagem', id: { $ne: 'area-1' } },
    },
  ]);
  assert.equal(em.flushCalls, 1);
  assert.equal(area.neighborhood, 'Boa Viagem');
  assert.equal(area.city, 'Recife');
  assert.equal(area.fee, '9.00');
  assert.equal(area.normalizedKey, 'recife boa viagem');
  assert.equal(area.isActive, false);
  assert.deepEqual(result, {
    status: 'updated',
    area: {
      id: 'area-1',
      neighborhood: 'Boa Viagem',
      city: 'Recife',
      fee: 9,
      normalizedKey: 'recife boa viagem',
      isActive: false,
    },
  });
});

test('returns not-found without flushing when updating a missing delivery area', async (): Promise<void> => {
  const em = new FakeEntityManager([null]);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmDeliveryAreaWriteRepository();

  const result = await repository.update('missing-area', { city: 'Recife' }, context);

  assert.deepEqual(result, { status: 'not-found' });
  assert.equal(em.flushCalls, 0);
});

test('returns duplicate without mutating or flushing when an update key already exists', async (): Promise<void> => {
  const area = createDeliveryArea('area-1');
  const duplicate = createDeliveryArea('duplicate-area', {
    neighborhood: 'Boa Viagem',
    city: 'Recife',
    fee: '9.00',
    normalizedKey: 'recife boa viagem',
  });
  const em = new FakeEntityManager([area, duplicate]);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmDeliveryAreaWriteRepository();

  const result = await repository.update(
    'area-1',
    { neighborhood: 'Boa Viagem', city: 'Recife', fee: 9 },
    context,
  );

  assert.deepEqual(result, { status: 'duplicate-normalized-key' });
  assert.equal(em.flushCalls, 0);
  assert.equal(area.neighborhood, 'Centro');
  assert.equal(area.city, 'Recife');
  assert.equal(area.fee, '7.50');
  assert.equal(area.normalizedKey, 'recife centro');
});

test('soft-deletes a delivery area through the provided transaction context', async (): Promise<void> => {
  const area = createDeliveryArea('area-1');
  const em = new FakeEntityManager([area]);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmDeliveryAreaWriteRepository();

  const result = await repository.delete('area-1', context);

  assert.deepEqual(em.findOneCalls, [
    {
      entity: DeliveryArea,
      where: { id: 'area-1' },
    },
  ]);
  assert.deepEqual(result, { status: 'deleted' });
  assert.equal(area.isActive, false);
  assert.equal(em.flushCalls, 1);
});

test('returns not-found without flushing when deleting a missing delivery area', async (): Promise<void> => {
  const em = new FakeEntityManager([null]);
  const context = new MikroOrmTransactionContext(em as unknown as EntityManager);
  const repository = new MikroOrmDeliveryAreaWriteRepository();

  const result = await repository.delete('missing-area', context);

  assert.deepEqual(result, { status: 'not-found' });
  assert.equal(em.flushCalls, 0);
});

type CreateCall = {
  readonly data: DeliveryAreaCreatePayload;
  readonly entity: typeof DeliveryArea;
};

type DeliveryAreaCreatePayload = {
  readonly city: string;
  readonly fee: string;
  readonly neighborhood: string;
  readonly normalizedKey: string;
};

type FindOneCall = {
  readonly entity: typeof DeliveryArea;
  readonly where: FindOneWhere;
};

type FindOneWhere =
  | { readonly id: string }
  | { readonly normalizedKey: string }
  | { readonly id: { readonly $ne: string }; readonly normalizedKey: string };

class FakeEntityManager {
  public readonly createCalls: CreateCall[] = [];
  public readonly findOneCalls: FindOneCall[] = [];
  public flushCalls = 0;

  public constructor(private readonly findOneResults: readonly (DeliveryArea | null)[] = []) {}

  public create(entity: typeof DeliveryArea, data: DeliveryAreaCreatePayload): DeliveryArea {
    this.createCalls.push({ entity, data });

    return createDeliveryArea('created-area', data);
  }

  public async findOne(
    entity: typeof DeliveryArea,
    where: FindOneWhere,
  ): Promise<DeliveryArea | null> {
    this.findOneCalls.push({ entity, where });

    const result = this.findOneResults[this.findOneCalls.length - 1];

    return result ?? null;
  }

  public async flush(): Promise<void> {
    this.flushCalls += 1;
  }
}

function createDeliveryArea(id: string, data?: DeliveryAreaCreatePayload): DeliveryArea {
  const area = new DeliveryArea();
  area.id = id;
  area.neighborhood = data?.neighborhood ?? 'Centro';
  area.city = data?.city ?? 'Recife';
  area.fee = data?.fee ?? '7.50';
  area.normalizedKey = data?.normalizedKey ?? 'recife centro';
  area.isActive = true;

  return area;
}
