import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const CUSTOMER_LOYALTY_ADJUSTMENT_REPOSITORY = Symbol(
  'CUSTOMER_LOYALTY_ADJUSTMENT_REPOSITORY',
);

export type CustomerLoyaltyAdjustmentTarget = {
  readonly balance: number;
  readonly id: string;
  readonly phone: string;
};

export type ApplyCustomerLoyaltyAdjustmentCommand = {
  readonly customerId: string;
  readonly customerPhone: string;
  readonly description: string;
  readonly points: number;
};

export type CustomerLoyaltyAdjustmentTransactionModel = {
  readonly id: string;
  readonly points: number;
  readonly type: 'adjustment';
};

export type ApplyCustomerLoyaltyAdjustmentResult =
  | {
      readonly balance: number;
      readonly status: 'adjusted';
      readonly transaction: CustomerLoyaltyAdjustmentTransactionModel;
    }
  | {
      readonly status: 'insufficient-balance';
    };

export interface CustomerLoyaltyAdjustmentRepository {
  applyAdjustment(
    command: ApplyCustomerLoyaltyAdjustmentCommand,
    context: TransactionContext,
  ): Promise<ApplyCustomerLoyaltyAdjustmentResult>;

  findTarget(
    customerId: string,
    context: TransactionContext,
  ): Promise<CustomerLoyaltyAdjustmentTarget | null>;
}
