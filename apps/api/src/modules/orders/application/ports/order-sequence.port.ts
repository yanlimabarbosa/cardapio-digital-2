import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ORDER_SEQUENCE_REPOSITORY = Symbol('ORDER_SEQUENCE_REPOSITORY');

export interface OrderSequenceRepository {
  nextDailySequence(context?: TransactionContext): Promise<number>;
}
