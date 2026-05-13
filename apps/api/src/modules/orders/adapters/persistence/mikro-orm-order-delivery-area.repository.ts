import { EntityManager } from '@mikro-orm/postgresql';
import { DeliveryArea } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  OrderDeliveryAreaModel,
  OrderDeliveryAreaRepository,
} from '../../application/ports/order-delivery-area.port';

export class MikroOrmOrderDeliveryAreaRepository implements OrderDeliveryAreaRepository {
  public constructor(private readonly em: EntityManager) {}

  public async findActiveById(
    id: string,
    context?: TransactionContext,
  ): Promise<OrderDeliveryAreaModel | null> {
    const em = context ? getMikroOrmEntityManager(context) : this.em;
    const area = await em.findOne(DeliveryArea, { id, isActive: true });

    if (!area) {
      return null;
    }

    return {
      id: area.id,
      feeAmount: area.fee,
      feeCents: this.decimalToCents(area.fee),
      matchNormalizedKeys: area.matchNormalizedKeys.length > 0 ? area.matchNormalizedKeys : [area.normalizedKey],
    };
  }

  private decimalToCents(value: string): number {
    return Math.round(Number.parseFloat(value) * 100);
  }
}
