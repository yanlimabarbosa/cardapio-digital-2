import assert from 'node:assert/strict';
import test from 'node:test';
import type { DeliveryAreaReadRepository } from '../../../src/modules/delivery-areas/application/ports/delivery-area.read-repository.port';
import type { DeliveryAreaReadModel } from '../../../src/modules/delivery-areas/application/read-models/delivery-area.read-model';
import { ListActiveDeliveryAreasUseCase } from '../../../src/modules/delivery-areas/application/use-cases/list-active-delivery-areas.use-case';
import { ListAdminDeliveryAreasUseCase } from '../../../src/modules/delivery-areas/application/use-cases/list-admin-delivery-areas.use-case';

const activeArea: DeliveryAreaReadModel = {
  id: 'area-1',
  neighborhood: 'Centro',
  city: 'Recife',
  fee: 7.5,
  normalizedKey: 'recife-centro',
  isActive: true,
};

const inactiveArea: DeliveryAreaReadModel = {
  id: 'area-2',
  neighborhood: 'Boa Viagem',
  city: 'Recife',
  fee: 9,
  normalizedKey: 'recife-boa-viagem',
  isActive: false,
};

test('lists active delivery areas through the read repository', async (): Promise<void> => {
  const repository = new FakeDeliveryAreaReadRepository([activeArea], [activeArea, inactiveArea]);
  const useCase = new ListActiveDeliveryAreasUseCase(repository);

  const result = await useCase.execute();

  assert.deepEqual(result, [activeArea]);
  assert.deepEqual(repository.calls, ['listActive']);
});

test('lists all admin delivery areas through the read repository', async (): Promise<void> => {
  const repository = new FakeDeliveryAreaReadRepository([activeArea], [activeArea, inactiveArea]);
  const useCase = new ListAdminDeliveryAreasUseCase(repository);

  const result = await useCase.execute();

  assert.deepEqual(result, [activeArea, inactiveArea]);
  assert.deepEqual(repository.calls, ['listAll']);
});

class FakeDeliveryAreaReadRepository implements DeliveryAreaReadRepository {
  public readonly calls: string[] = [];

  public constructor(
    private readonly activeAreas: readonly DeliveryAreaReadModel[],
    private readonly allAreas: readonly DeliveryAreaReadModel[],
  ) {}

  public async listActive(): Promise<readonly DeliveryAreaReadModel[]> {
    this.calls.push('listActive');

    return this.activeAreas;
  }

  public async listAll(): Promise<readonly DeliveryAreaReadModel[]> {
    this.calls.push('listAll');

    return this.allAreas;
  }
}
