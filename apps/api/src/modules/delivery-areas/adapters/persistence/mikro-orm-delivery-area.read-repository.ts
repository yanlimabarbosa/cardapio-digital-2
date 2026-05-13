import { EntityManager } from '@mikro-orm/postgresql';
import { DeliveryArea } from '../../../../entities';
import type { DeliveryAreaReadRepository } from '../../application/ports/delivery-area.read-repository.port';
import type { DeliveryAreaReadModel } from '../../application/read-models/delivery-area.read-model';

export class MikroOrmDeliveryAreaReadRepository implements DeliveryAreaReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async listActive(): Promise<readonly DeliveryAreaReadModel[]> {
    const areas = await this.em.find(
      DeliveryArea,
      { isActive: true },
      { orderBy: { city: 'ASC', neighborhood: 'ASC' } },
    );

    return areas.map((area): DeliveryAreaReadModel => this.toReadModel(area));
  }

  public async listAll(): Promise<readonly DeliveryAreaReadModel[]> {
    const areas = await this.em.find(
      DeliveryArea,
      {},
      { orderBy: { isActive: 'DESC', city: 'ASC', neighborhood: 'ASC' } },
    );

    return areas.map((area): DeliveryAreaReadModel => this.toReadModel(area));
  }

  private toReadModel(area: DeliveryArea): DeliveryAreaReadModel {
    return {
      id: area.id,
      neighborhood: area.neighborhood,
      city: area.city,
      fee: Number.parseFloat(area.fee),
      normalizedKey: area.normalizedKey,
      matchNormalizedKeys: this.matchNormalizedKeys(area),
      isActive: area.isActive ?? true,
    };
  }

  private matchNormalizedKeys(area: DeliveryArea): readonly string[] {
    return area.matchNormalizedKeys.length > 0 ? area.matchNormalizedKeys : [area.normalizedKey];
  }
}
