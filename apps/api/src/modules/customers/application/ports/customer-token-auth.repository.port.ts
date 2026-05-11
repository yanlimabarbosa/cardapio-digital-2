import type { AuthenticatedCustomerReadModel } from '../read-models/authenticated-customer.read-model';

export const CUSTOMER_TOKEN_AUTH_REPOSITORY = Symbol('CUSTOMER_TOKEN_AUTH_REPOSITORY');

export interface CustomerTokenAuthRepository {
  findByToken(token: string): Promise<AuthenticatedCustomerReadModel | null>;
}
