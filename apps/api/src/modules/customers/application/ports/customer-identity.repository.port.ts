import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type { CustomerPhone } from '../../domain/customer-phone.value-object';

export const CUSTOMER_IDENTITY_REPOSITORY = Symbol('CUSTOMER_IDENTITY_REPOSITORY');

export type CustomerIdentityModel = {
  readonly hasPassword: boolean;
  readonly isAdmin: boolean;
  readonly loyaltyPoints: number;
  readonly name: string;
  readonly phone: string;
};

export type CustomerIdentifyRepositoryResult =
  | {
      readonly status: 'missing';
    }
  | {
      readonly status: 'password-required';
    }
  | {
      readonly customer: CustomerIdentityModel;
      readonly status: 'authenticated';
      readonly token: string;
    };

export interface CustomerIdentityRepository {
  identifyByPhone(
    phone: CustomerPhone,
    context: TransactionContext,
  ): Promise<CustomerIdentifyRepositoryResult>;
}
