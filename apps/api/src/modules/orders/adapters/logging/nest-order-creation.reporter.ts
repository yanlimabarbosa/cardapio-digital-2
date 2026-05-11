import { Logger } from '@nestjs/common';
import type {
  OrderCreatedReport,
  OrderCreationReporter,
} from '../../application/ports/order-creation-reporter.port';

export class NestOrderCreationReporter implements OrderCreationReporter {
  private readonly logger = new Logger(NestOrderCreationReporter.name);

  public async orderCreated(report: OrderCreatedReport): Promise<void> {
    this.logger.log(
      `Order #${report.orderNumber} created - ${report.customerName} - R$${report.totalAmount} - ${report.paymentMethod}`,
    );
  }
}
