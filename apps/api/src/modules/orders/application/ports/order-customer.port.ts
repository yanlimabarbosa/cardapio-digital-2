import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ORDER_CUSTOMER_REPOSITORY = Symbol('ORDER_CUSTOMER_REPOSITORY');

export type FindOrCreateOrderCustomerCommand = {
  readonly context?: TransactionContext;
  readonly customerToken?: string | null;
  readonly name: string;
  readonly phone: string;
};

export type OrderCustomerModel = {
  readonly id: string;
  readonly loyaltyPoints: number;
  readonly token: string;
};

export interface OrderCustomerRepository {
  findOrCreateForOrder(command: FindOrCreateOrderCustomerCommand): Promise<OrderCustomerModel>;
}
