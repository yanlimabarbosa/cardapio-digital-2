import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ORDER_LOYALTY_REDEMPTION_REPOSITORY = Symbol('ORDER_LOYALTY_REDEMPTION_REPOSITORY');

export interface DebitOrderLoyaltyRedemptionCommand {
  readonly context?: TransactionContext;
  readonly customerId: string;
  readonly points: number;
}

export interface OrderLoyaltyRedemptionDebitResult {
  readonly debited: boolean;
}

export interface RecordOrderLoyaltyRedemptionCommand {
  readonly context?: TransactionContext;
  readonly customerId: string;
  readonly orderId: string;
  readonly orderNumber: number;
  readonly points: number;
}

export interface OrderLoyaltyRedemptionRepository {
  debitPoints(
    command: DebitOrderLoyaltyRedemptionCommand,
  ): Promise<OrderLoyaltyRedemptionDebitResult>;
  recordRedemption(command: RecordOrderLoyaltyRedemptionCommand): Promise<void>;
}
