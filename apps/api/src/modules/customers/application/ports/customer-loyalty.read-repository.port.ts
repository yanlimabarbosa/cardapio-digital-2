import type { CustomerLoyaltyReadModel } from '../read-models/customer-loyalty.read-model';

export const CUSTOMER_LOYALTY_READ_REPOSITORY = Symbol('CUSTOMER_LOYALTY_READ_REPOSITORY');

export type GetCustomerLoyaltyReadQuery = {
  readonly customerId: string;
  readonly limit: number;
  readonly page: number;
};

export interface CustomerLoyaltyReadRepository {
  getByCustomerId(query: GetCustomerLoyaltyReadQuery): Promise<CustomerLoyaltyReadModel | null>;
}
