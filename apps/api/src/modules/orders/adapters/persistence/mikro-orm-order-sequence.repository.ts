import { EntityManager } from '@mikro-orm/postgresql';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type { OrderSequenceRepository } from '../../application/ports/order-sequence.port';

type DailyOrderCounterRow = {
  readonly counter?: number;
};

export class MikroOrmOrderSequenceRepository implements OrderSequenceRepository {
  public constructor(private readonly em: EntityManager) {}

  public async nextDailySequence(context?: TransactionContext): Promise<number> {
    const em = context ? getMikroOrmEntityManager(context) : this.em;
    const result = await em.getConnection().execute<DailyOrderCounterRow[]>(
      `INSERT INTO daily_order_counter (date, counter) VALUES (CURRENT_DATE, 1)
       ON CONFLICT (date) DO UPDATE SET counter = daily_order_counter.counter + 1
       RETURNING counter`,
    );

    return result[0]?.counter ?? 1;
  }
}
