import { EntityManager } from '@mikro-orm/postgresql';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../application/unit-of-work/unit-of-work.port';

export class MikroOrmTransactionContext implements TransactionContext {
  public readonly contextName = 'mikro-orm';

  public constructor(public readonly em: EntityManager) {}
}

export class MikroOrmUnitOfWork implements UnitOfWork {
  public constructor(private readonly em: EntityManager) {}

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    return this.em.transactional((transactionalEm) => work(new MikroOrmTransactionContext(transactionalEm)));
  }
}

export function getMikroOrmEntityManager(context: TransactionContext): EntityManager {
  if (context instanceof MikroOrmTransactionContext) {
    return context.em;
  }

  throw new Error(`Expected MikroOrmTransactionContext, received ${context.contextName}`);
}
