export const ORDER_STORE_AVAILABILITY_CHECKER = Symbol('ORDER_STORE_AVAILABILITY_CHECKER');

export type CheckOrderStoreAvailabilityQuery = {
  readonly scheduledFor: Date | null;
};

export type OrderStoreAvailabilityResult = {
  readonly open: boolean;
  readonly reason?: string | null;
};

export interface OrderStoreAvailabilityChecker {
  check(query: CheckOrderStoreAvailabilityQuery): Promise<OrderStoreAvailabilityResult>;
}
