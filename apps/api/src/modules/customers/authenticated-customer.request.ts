import { AuthenticatedCustomerReadModel } from './application/read-models/authenticated-customer.read-model';

export type AuthenticatedCustomerRequest = {
  customer: AuthenticatedCustomerReadModel;
  readonly headers: Record<string, string | string[] | undefined>;
};
