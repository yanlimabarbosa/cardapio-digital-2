import type { CustomerProfileReadModel } from '../read-models/customer-profile.read-model';

export const CUSTOMER_PROFILE_READ_REPOSITORY = Symbol('CUSTOMER_PROFILE_READ_REPOSITORY');

export interface CustomerProfileReadRepository {
  getByCustomerId(customerId: string): Promise<CustomerProfileReadModel | null>;
}
