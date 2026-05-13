import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { MikroOrmDeliveryAreaReadRepository } from '../../../src/modules/delivery-areas/adapters/persistence/mikro-orm-delivery-area.read-repository';
import { DeliveryArea } from '../../../src/entities';

test('lists active delivery areas with the legacy ordering and response shape', async (): Promise<void> => {
  const area = createDeliveryArea('area-1', { fee: '7.50', isActive: undefined });
  const em = new FakeEntityManager([area]);
  const repository = new MikroOrmDeliveryAreaReadRepository(em as unknown as EntityManager);

  const result = await repository.listActive();

  assert.deepEqual(em.findCalls, [
    {
      entity: DeliveryArea,
      where: { isActive: true },
      options: { orderBy: { city: 'ASC', neighborhood: 'ASC' } },
    },
  ]);
  assert.deepEqual(result, [
    {
      id: 'area-1',
      neighborhood: 'Centro',
      city: 'Recife',
      fee: 7.5,
      normalizedKey: 'recife-centro',
      matchNormalizedKeys: ['recife-centro'],
      isActive: true,
    },
  ]);
});

test('lists all admin delivery areas with active rows first', async (): Promise<void> => {
  const area = createDeliveryArea('area-2', { fee: '9.00', isActive: false });
  const em = new FakeEntityManager([area]);
  const repository = new MikroOrmDeliveryAreaReadRepository(em as unknown as EntityManager);

  const result = await repository.listAll();

  assert.deepEqual(em.findCalls, [
    {
      entity: DeliveryArea,
      where: {},
      options: { orderBy: { isActive: 'DESC', city: 'ASC', neighborhood: 'ASC' } },
    },
  ]);
  assert.deepEqual(result, [
    {
      id: 'area-2',
      neighborhood: 'Centro',
      city: 'Recife',
      fee: 9,
      normalizedKey: 'recife-centro',
      matchNormalizedKeys: ['recife-centro'],
      isActive: false,
    },
  ]);
});

type FindCall = {
  readonly entity: typeof DeliveryArea;
  readonly options: {
    readonly orderBy: {
      readonly city: 'ASC';
      readonly isActive?: 'DESC';
      readonly neighborhood: 'ASC';
    };
  };
  readonly where: Record<string, never> | { readonly isActive: true };
};

class FakeEntityManager {
  public readonly findCalls: FindCall[] = [];

  public constructor(private readonly areas: readonly DeliveryArea[]) {}

  public async find(
    entity: typeof DeliveryArea,
    where: FindCall['where'],
    options: FindCall['options'],
  ): Promise<DeliveryArea[]> {
    this.findCalls.push({ entity, where, options });

    return [...this.areas];
  }
}

function createDeliveryArea(
  id: string,
  overrides: { readonly fee: string; readonly isActive: boolean | undefined },
): DeliveryArea {
  const area = new DeliveryArea();
  area.id = id;
  area.neighborhood = 'Centro';
  area.city = 'Recife';
  area.fee = overrides.fee;
  area.normalizedKey = 'recife-centro';
  area.matchNormalizedKeys = ['recife-centro'];
  area.isActive = overrides.isActive;

  return area;
}
