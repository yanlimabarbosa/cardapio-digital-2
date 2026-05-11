import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ORDER_COUPON_USAGE_REPOSITORY = Symbol('ORDER_COUPON_USAGE_REPOSITORY');

export interface RecordOrderCouponUsageCommand {
  readonly context?: TransactionContext;
  readonly couponId: string;
  readonly customerId: string;
  readonly orderId: string;
}

export interface OrderCouponUsageRepository {
  recordUsage(command: RecordOrderCouponUsageCommand): Promise<void>;
}
