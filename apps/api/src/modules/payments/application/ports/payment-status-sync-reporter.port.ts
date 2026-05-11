export const PAYMENT_STATUS_SYNC_REPORTER = Symbol('PAYMENT_STATUS_SYNC_REPORTER');

export type PaymentStatusSyncFailureReport = {
  readonly errorMessage: string;
  readonly orderId: string;
};

export interface PaymentStatusSyncReporter {
  syncFailed(report: PaymentStatusSyncFailureReport): Promise<void>;
}
