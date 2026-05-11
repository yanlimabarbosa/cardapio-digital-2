import type { AdminCustomerReadModel } from '../read-models/admin-customer.read-model';

export const ADMIN_CUSTOMER_READ_REPOSITORY = Symbol('ADMIN_CUSTOMER_READ_REPOSITORY');

export interface AdminCustomerReadRepository {
  list(search?: string): Promise<readonly AdminCustomerReadModel[]>;
}
