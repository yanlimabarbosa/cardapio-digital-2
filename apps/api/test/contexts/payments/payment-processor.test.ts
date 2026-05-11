import assert from 'node:assert/strict';
import test from 'node:test';
import type { Job } from 'bullmq';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import { PaymentProcessor } from '../../../src/modules/payments/payment.processor';
import type { GatewayPaymentStatus } from '../../../src/modules/payments/domain/payment-status.policy';
import type {
  CardPaymentResult,
  CreateCreditCardPaymentInput,
  CreateDebitCardPaymentInput,
  CreatePixPaymentInput,
  GetPaymentStatusQuery,
  Payment3dsSessionResult,
  PaymentGateway,
  PaymentGatewayStatusResult,
  PixPaymentResult,
} from '../../../src/modules/payments/application/ports/payment-gateway.port';
import type {
  ApplyPaymentGatewayStatusCommand,
  ApplyPaymentGatewayStatusResult,
  ApplyQueuedPaymentResultCommand,
  ApplyQueuedPaymentResultResult,
  FindPaymentOrderQuery,
  MarkPaymentPendingCommand,
  PaymentNewOrderNotification,
  PaymentOrder,
  PaymentOrderRepository,
} from '../../../src/modules/payments/application/ports/payment-order.port';
import type { PaymentRealtimeNotifier } from '../../../src/modules/payments/application/ports/payment-realtime-notifier.port';

type ProcessorJob = Parameters<PaymentProcessor['process']>[0];

type Harness = {
  readonly gateway: FakePaymentGateway;
  readonly notifier: FakePaymentRealtimeNotifier;
  readonly orders: FakePaymentOrderRepository;
  readonly processor: PaymentProcessor;
};

test('applies queued webhook status through the payment order port and notifies after approval', async (): Promise<void> => {
  const notification = createNotification();
  const harness = createHarness({
    queuedResult: {
      order: paidOrder,
      status: 'approved',
      processed: true,
      newOrderNotification: notification,
    },
  });

  const result = await harness.processor.process(createJob({
    paymentId: 'CHAR_1',
    referenceId: 'order-1',
    status: 'approved',
  }));

  assert.deepEqual(harness.orders.queuedCommands, [
    {
      paymentId: 'CHAR_1',
      referenceId: 'order-1',
      status: 'approved',
    },
  ]);
  assert.deepEqual(harness.gateway.statusQueries, []);
  assert.deepEqual(harness.notifier.notifications, [notification]);
  assert.deepEqual(result, { processed: true, status: 'approved' });
});

test('fetches gateway payment status when the queued job has no mapped status', async (): Promise<void> => {
  const harness = createHarness({
    gatewayStatus: {
      externalId: 'ORDE_1',
      referenceId: 'order-1',
      status: 'approved',
    },
    queuedResult: {
      order: paidOrder,
      status: 'approved',
      processed: true,
      newOrderNotification: null,
    },
  });

  const result = await harness.processor.process(createJob({ paymentId: 'ORDE_1' }));

  assert.deepEqual(harness.gateway.statusQueries, [{ externalId: 'ORDE_1' }]);
  assert.deepEqual(harness.orders.queuedCommands, [
    {
      paymentId: 'ORDE_1',
      referenceId: 'order-1',
      status: 'approved',
    },
  ]);
  assert.deepEqual(result, { processed: true, status: 'approved' });
});

test('keeps skipped queued results without emitting realtime notifications', async (): Promise<void> => {
  const harness = createHarness({
    queuedResult: {
      order: {
        ...paidOrder,
        status: OrderStatus.CANCELLED,
      },
      skipped: true,
      reason: 'Order already in terminal state: cancelled',
    },
  });

  const result = await harness.processor.process(createJob({
    paymentId: 'CHAR_1',
    referenceId: 'order-1',
    status: 'approved',
  }));

  assert.deepEqual(harness.notifier.notifications, []);
  assert.deepEqual(result, {
    skipped: true,
    reason: 'Order already in terminal state: cancelled',
  });
});

function createHarness(options: {
  readonly gatewayStatus?: PaymentGatewayStatusResult;
  readonly queuedResult: ApplyQueuedPaymentResultResult;
}): Harness {
  const gateway = new FakePaymentGateway(options.gatewayStatus ?? {
    externalId: 'ORDE_1',
    referenceId: 'order-1',
    status: 'pending',
  });
  const orders = new FakePaymentOrderRepository(options.queuedResult);
  const notifier = new FakePaymentRealtimeNotifier();
  const processor = new PaymentProcessor(gateway, orders, notifier);

  return {
    gateway,
    notifier,
    orders,
    processor,
  };
}

class FakePaymentGateway implements PaymentGateway {
  public readonly statusQueries: GetPaymentStatusQuery[] = [];

  public constructor(
    private readonly statusResult: PaymentGatewayStatusResult,
  ) {}

  public async createPixPayment(_input: CreatePixPaymentInput): Promise<PixPaymentResult> {
    throw new Error('createPixPayment should not be called by PaymentProcessor');
  }

  public async create3dsSession(): Promise<Payment3dsSessionResult> {
    throw new Error('create3dsSession should not be called by PaymentProcessor');
  }

  public async createCreditCardPayment(_input: CreateCreditCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error('createCreditCardPayment should not be called by PaymentProcessor');
  }

  public async createDebitCardPayment(_input: CreateDebitCardPaymentInput): Promise<CardPaymentResult> {
    throw new Error('createDebitCardPayment should not be called by PaymentProcessor');
  }

  public async getPaymentStatus(query: GetPaymentStatusQuery): Promise<PaymentGatewayStatusResult> {
    this.statusQueries.push(query);
    return this.statusResult;
  }
}

class FakePaymentOrderRepository implements PaymentOrderRepository {
  public readonly queuedCommands: ApplyQueuedPaymentResultCommand[] = [];

  public constructor(private readonly queuedResult: ApplyQueuedPaymentResultResult) {}

  public async findById(_query: FindPaymentOrderQuery): Promise<PaymentOrder | null> {
    throw new Error('findById should not be called by PaymentProcessor');
  }

  public async markPaymentPending(_command: MarkPaymentPendingCommand): Promise<PaymentOrder> {
    throw new Error('markPaymentPending should not be called by PaymentProcessor');
  }

  public async applyGatewayStatus(
    _command: ApplyPaymentGatewayStatusCommand,
  ): Promise<ApplyPaymentGatewayStatusResult> {
    throw new Error('applyGatewayStatus should not be called by PaymentProcessor');
  }

  public async applyQueuedPaymentResult(
    command: ApplyQueuedPaymentResultCommand,
  ): Promise<ApplyQueuedPaymentResultResult> {
    this.queuedCommands.push(command);
    return this.queuedResult;
  }
}

class FakePaymentRealtimeNotifier implements PaymentRealtimeNotifier {
  public readonly notifications: PaymentNewOrderNotification[] = [];

  public async newOrderPaid(notification: PaymentNewOrderNotification): Promise<void> {
    this.notifications.push(notification);
  }
}

function createJob(data: {
  readonly paymentId: string;
  readonly referenceId?: string;
  readonly status?: GatewayPaymentStatus;
}): ProcessorJob {
  return { data } as Job<{
    readonly paymentId: string;
    readonly referenceId?: string;
    readonly status?: GatewayPaymentStatus;
  }> as ProcessorJob;
}

function createNotification(): PaymentNewOrderNotification {
  return {
    id: 'order-1',
    orderNumber: 42,
    customerName: 'Cliente Teste',
    status: OrderStatus.PAID,
    totalAmount: 29.9,
    items: [
      {
        productName: 'Quentinha P',
        quantity: 1,
        subtotal: 29.9,
      },
    ],
    createdAt: '2026-05-08T15:00:00.000Z',
  };
}

const paidOrder: PaymentOrder = {
  id: 'order-1',
  orderNumber: 42,
  customerName: 'Cliente Teste',
  customerPhone: '81999999999',
  status: OrderStatus.PAID,
  totalAmount: '29.90',
  paymentMethod: PaymentMethod.PIX,
  paymentId: 'ORDE_1',
  paymentStatus: PaymentStatus.APPROVED,
  items: [
    {
      productName: 'Quentinha P',
      quantity: 1,
      subtotal: 29.9,
    },
  ],
  createdAt: new Date('2026-05-08T15:00:00.000Z'),
  updatedAt: new Date('2026-05-08T15:01:00.000Z'),
};
