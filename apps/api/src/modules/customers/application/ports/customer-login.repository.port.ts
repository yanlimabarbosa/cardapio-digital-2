import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type { CustomerPhone } from '../../domain/customer-phone.value-object';

export const CUSTOMER_LOGIN_REPOSITORY = Symbol('CUSTOMER_LOGIN_REPOSITORY');

export type CustomerLoginCredentials = {
  readonly password: string;
  readonly phone: CustomerPhone;
};

export type CustomerLoginModel = {
  readonly hasPassword: boolean;
  readonly isAdmin: boolean;
  readonly loyaltyPoints: number;
  readonly name: string;
  readonly phone: string;
};

export type CustomerLoginRepositoryResult =
  | {
      readonly customer: CustomerLoginModel;
      readonly status: 'authenticated';
      readonly token: string;
    }
  | {
      readonly status: 'invalid-credentials';
    }
  | {
      readonly status: 'invalid-password';
    };

export interface CustomerLoginRepository {
  login(
    credentials: CustomerLoginCredentials,
    context: TransactionContext,
  ): Promise<CustomerLoginRepositoryResult>;
}
