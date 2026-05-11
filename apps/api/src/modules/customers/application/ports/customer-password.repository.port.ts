import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const CUSTOMER_PASSWORD_REPOSITORY = Symbol('CUSTOMER_PASSWORD_REPOSITORY');

export type CustomerSetPasswordData = {
  readonly customerId: string;
  readonly password: string;
};

export type CustomerPasswordModel = {
  readonly hasPassword: boolean;
  readonly isAdmin: boolean;
  readonly loyaltyPoints: number;
  readonly name: string;
  readonly phone: string;
};

export type CustomerSetPasswordRepositoryResult =
  | {
      readonly customer: CustomerPasswordModel;
      readonly status: 'updated';
    }
  | {
      readonly status: 'already-set';
    }
  | {
      readonly status: 'not-found';
    };

export interface CustomerPasswordRepository {
  setPassword(
    data: CustomerSetPasswordData,
    context: TransactionContext,
  ): Promise<CustomerSetPasswordRepositoryResult>;
}
