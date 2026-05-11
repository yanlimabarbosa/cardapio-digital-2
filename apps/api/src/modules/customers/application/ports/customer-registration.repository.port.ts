import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type { CustomerPhone } from '../../domain/customer-phone.value-object';

export const CUSTOMER_REGISTRATION_REPOSITORY = Symbol('CUSTOMER_REGISTRATION_REPOSITORY');

export type CustomerRegistrationData = {
  readonly name: string;
  readonly password: string;
  readonly phone: CustomerPhone;
};

export type CustomerRegistrationModel = {
  readonly hasPassword: boolean;
  readonly isAdmin: boolean;
  readonly loyaltyPoints: number;
  readonly name: string;
  readonly phone: string;
};

export type CustomerRegistrationRepositoryResult =
  | {
      readonly customer: CustomerRegistrationModel;
      readonly status: 'registered';
      readonly token: string;
    }
  | {
      readonly status: 'duplicate-phone';
    };

export interface CustomerRegistrationRepository {
  register(
    data: CustomerRegistrationData,
    context: TransactionContext,
  ): Promise<CustomerRegistrationRepositoryResult>;
}
