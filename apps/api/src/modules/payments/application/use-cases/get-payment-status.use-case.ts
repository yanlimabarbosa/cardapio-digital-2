import { OrderStatus, PaymentStatus } from '@cardapio/shared';
import type { PaymentGateway } from '../ports/payment-gateway.port';
import type {
  ApplyPaymentGatewayStatusResult,
  PaymentOrder,
  PaymentOrderRepository,
} from '../ports/payment-order.port';
import type { PaymentRealtimeNotifier } from '../ports/payment-realtime-notifier.port';
import type { PaymentStatusSyncReporter } from '../ports/payment-status-sync-reporter.port';

export type GetPaymentStatusCommand = {
  readonly orderId: string;
};

export type GetPaymentStatusResult = {
  readonly orderId: string;
  readonly orderStatus?: OrderStatus;
  readonly paymentStatus: PaymentStatus | null;
};

export class PaymentStatusOrderNotFoundError extends Error {
  public constructor(orderId: string) {
    super(`Order ${orderId} not found`);
  }
}

export class GetPaymentStatusUseCase {
  public constructor(
    private readonly paymentOrders: PaymentOrderRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly paymentRealtimeNotifier: PaymentRealtimeNotifier,
    private readonly paymentStatusSyncReporter: PaymentStatusSyncReporter,
  ) {}

  public async execute(command: GetPaymentStatusCommand): Promise<GetPaymentStatusResult> {
    let order = await this.getPaymentOrder(command.orderId);

    if (this.shouldSyncGatewayStatus(order)) {
      order = await this.syncGatewayStatus(order);
    }

    return {
      orderId: order.id,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus || null,
    };
  }

  private async getPaymentOrder(orderId: string): Promise<PaymentOrder> {
    const order = await this.paymentOrders.findById({ orderId });

    if (!order) {
      throw new PaymentStatusOrderNotFoundError(orderId);
    }

    return order;
  }

  private shouldSyncGatewayStatus(order: PaymentOrder): boolean {
    return Boolean(
      order.paymentId &&
        order.paymentStatus !== PaymentStatus.APPROVED &&
        order.paymentStatus !== PaymentStatus.REJECTED,
    );
  }

  private async syncGatewayStatus(order: PaymentOrder): Promise<PaymentOrder> {
    const paymentId = order.paymentId;
    if (!paymentId) return order;

    try {
      const paymentStatus = await this.paymentGateway.getPaymentStatus({ externalId: paymentId });
      const result = await this.paymentOrders.applyGatewayStatus({
        orderId: order.id,
        status: paymentStatus.status,
      });
      await this.emitNewOrderIfNeeded(result);
      return result.order;
    } catch (error: unknown) {
      await this.paymentStatusSyncReporter.syncFailed({
        orderId: order.id,
        errorMessage: this.getErrorMessage(error),
      });
      return order;
    }
  }

  private async emitNewOrderIfNeeded(result: ApplyPaymentGatewayStatusResult): Promise<void> {
    if (result.newOrderNotification) {
      await this.paymentRealtimeNotifier.newOrderPaid(result.newOrderNotification);
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
