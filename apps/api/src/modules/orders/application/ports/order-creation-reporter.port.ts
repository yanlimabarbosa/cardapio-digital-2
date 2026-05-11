import type { PaymentMethod } from '@cardapio/shared';

export const ORDER_CREATION_REPORTER = Symbol('ORDER_CREATION_REPORTER');

export type OrderCreatedReport = {
  readonly customerName: string;
  readonly paymentMethod: PaymentMethod;
  readonly orderNumber: number;
  readonly totalAmount: string;
};

export interface OrderCreationReporter {
  orderCreated(report: OrderCreatedReport): Promise<void>;
}
