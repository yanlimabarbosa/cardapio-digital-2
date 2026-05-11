import type { CustomerOrderHistoryPageReadModel } from '../read-models/customer-order-history.read-model';

export const CUSTOMER_ORDER_HISTORY_READ_REPOSITORY = Symbol(
  'CUSTOMER_ORDER_HISTORY_READ_REPOSITORY',
);

export type GetCustomerOrderHistoryReadQuery = {
  readonly customerId: string;
  readonly limit: number;
  readonly page: number;
};

export interface CustomerOrderHistoryReadRepository {
  getByCustomerId(
    query: GetCustomerOrderHistoryReadQuery,
  ): Promise<CustomerOrderHistoryPageReadModel | null>;
}
