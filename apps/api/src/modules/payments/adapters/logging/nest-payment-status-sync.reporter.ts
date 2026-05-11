import { Logger } from '@nestjs/common';
import type {
  PaymentStatusSyncFailureReport,
  PaymentStatusSyncReporter,
} from '../../application/ports/payment-status-sync-reporter.port';

export class NestPaymentStatusSyncReporter implements PaymentStatusSyncReporter {
  private readonly logger = new Logger(NestPaymentStatusSyncReporter.name);

  public async syncFailed(report: PaymentStatusSyncFailureReport): Promise<void> {
    this.logger.warn(
      `Unable to sync PagBank payment status for order ${report.orderId}: ${report.errorMessage}`,
    );
  }
}
