import { DeliveryArea } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import { DeliveryAreaKeyPolicy } from '../../domain/delivery-area-key.policy';
import type {
  CreateDeliveryAreaData,
  CreateDeliveryAreaResult,
  DeleteDeliveryAreaResult,
  DeliveryAreaMutationModel,
  DeliveryAreaWriteRepository,
  UpdateDeliveryAreaData,
  UpdateDeliveryAreaResult,
} from '../../application/ports/delivery-area-write.repository.port';

export class MikroOrmDeliveryAreaWriteRepository implements DeliveryAreaWriteRepository {
  public async create(
    data: CreateDeliveryAreaData,
    context: TransactionContext,
  ): Promise<CreateDeliveryAreaResult> {
    const em = getMikroOrmEntityManager(context);
    const existing = await em.findOne(DeliveryArea, { normalizedKey: data.normalizedKey });

    if (existing) {
      return { status: 'duplicate-normalized-key' };
    }

    const area = em.create(DeliveryArea, {
      neighborhood: data.neighborhood,
      city: data.city,
      fee: data.fee.toFixed(2),
      normalizedKey: data.normalizedKey,
      matchNormalizedKeys: [data.normalizedKey],
    });

    await em.flush();

    return {
      status: 'created',
      area: this.toMutationModel(area),
    };
  }

  public async delete(id: string, context: TransactionContext): Promise<DeleteDeliveryAreaResult> {
    const em = getMikroOrmEntityManager(context);
    const area = await em.findOne(DeliveryArea, { id });

    if (!area) {
      return { status: 'not-found' };
    }

    area.isActive = false;

    await em.flush();

    return { status: 'deleted' };
  }

  public async update(
    id: string,
    data: UpdateDeliveryAreaData,
    context: TransactionContext,
  ): Promise<UpdateDeliveryAreaResult> {
    const em = getMikroOrmEntityManager(context);
    const area = await em.findOne(DeliveryArea, { id });

    if (!area) {
      return { status: 'not-found' };
    }

    const shouldUpdateKey = data.neighborhood !== undefined || data.city !== undefined;
    const nextNeighborhood = data.neighborhood ?? area.neighborhood;
    const nextCity = data.city ?? area.city;
    const nextNormalizedKey = shouldUpdateKey
      ? DeliveryAreaKeyPolicy.create({ neighborhood: nextNeighborhood, city: nextCity }).normalizedKey()
      : area.normalizedKey;

    if (shouldUpdateKey) {
      const existing = await em.findOne(DeliveryArea, {
        normalizedKey: nextNormalizedKey,
        id: { $ne: id },
      });

      if (existing) {
        return { status: 'duplicate-normalized-key' };
      }
    }

    if (data.neighborhood !== undefined) {
      area.neighborhood = data.neighborhood;
    }

    if (data.city !== undefined) {
      area.city = data.city;
    }

    if (data.fee !== undefined) {
      area.fee = data.fee.toFixed(2);
    }

    if (data.isActive !== undefined) {
      area.isActive = data.isActive;
    }

    if (shouldUpdateKey) {
      area.normalizedKey = nextNormalizedKey;
    }

    await em.flush();

    return {
      status: 'updated',
      area: this.toMutationModel(area),
    };
  }

  private toMutationModel(area: DeliveryArea): DeliveryAreaMutationModel {
    return {
      id: area.id,
      neighborhood: area.neighborhood,
      city: area.city,
      fee: Number.parseFloat(area.fee),
      normalizedKey: area.normalizedKey,
      matchNormalizedKeys: area.matchNormalizedKeys.length > 0 ? area.matchNormalizedKeys : [area.normalizedKey],
      isActive: area.isActive ?? true,
    };
  }
}
