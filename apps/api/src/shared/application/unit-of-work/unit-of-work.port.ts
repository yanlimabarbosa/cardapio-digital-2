export interface TransactionContext {
  readonly contextName: string;
}

export type TransactionWork<T> = (context: TransactionContext) => Promise<T>;

export interface UnitOfWork {
  run<T>(work: TransactionWork<T>): Promise<T>;
}
