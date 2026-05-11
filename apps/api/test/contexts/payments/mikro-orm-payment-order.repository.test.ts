import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityManager } from '@mikro-orm/postgresql';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import { Order } from '../../../src/entities';
import { MikroOrmPaymentOrderRepository } from '../../../src/modules/payments/adapters/persistence/mikro-orm-payment-order.repository';
import type { ApplyQueuedPaymentResultResult } from '../../../src/modules/payments/application/ports/payment-order.port';

type FindOneWhere = {
  readonly id?: string;
  readonly paymentId?: string;
};

type FakeOrderItem = {
  readonly extras?: readonly { readonly name: string; readonly price: number }[];
  readonly productName: string;
  readonly quantity: number;
  readonly subtotal: string;
};

type FakeOrderOptions = {
  readonly createdAt?: Date;
  readonly id?: string;
  readonly items?: readonly FakeOrderItem[];
  readonly paymentId?: string;
  readonly paymentStatus?: PaymentStatus;
  readonly status?: OrderStatus;
  readonly updatedAt?: Date;
};

test('maps a payment order without leaking ORM entities', async (): Promise<void> => {
  const repository = new MikroOrmPaymentOrderRepository(createFakeEntityManager(createFakeOrder()));

  const result = await repository.findById({ orderId: 'order-1' });

  assert.ok(result);
  assert.equal(result.id, 'order-1');
  assert.equal(result.orderNumber, 42);
  assert.equal(result.customerName, 'Cliente Teste');
  assert.equal(result.customerPhone, '81999999999');
  assert.equal(result.customerEmail, 'cliente@example.com');
  assert.equal(result.totalAmount, '29.90');
  assert.equal(result.paymentMethod, PaymentMethod.PIX);
  assert.equal(result.status, OrderStatus.PENDING_PAYMENT);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.productName, 'Quentinha P');
  assert.deepEqual(result.deliveryAddress, {
    cep: '50000000',
    street: 'Rua Teste',
    number: '123',
    neighborhood: 'Centro',
    city: 'Recife',
    state: 'PE',
  });
});

test('returns null when a payment order is missing', async (): Promise<void> => {
  const repository = new MikroOrmPaymentOrderRepository(createFakeEntityManager(null));

  const result = await repository.findById({ orderId: 'missing-order' });

  assert.equal(result, null);
});

test('marks pix payment as pending and flushes the order', async (): Promise<void> => {
  const order = createFakeOrder();
  const flushes: string[] = [];
  const repository = new MikroOrmPaymentOrderRepository(createFakeEntityManager(order, flushes));

  const result = await repository.markPaymentPending({
    orderId: 'order-1',
    paymentId: 'pagbank-order-1',
  });

  assert.equal(order.paymentId, 'pagbank-order-1');
  assert.equal(order.paymentStatus, PaymentStatus.PENDING);
  assert.deepEqual(flushes, ['flush']);
  assert.equal(result.paymentId, 'pagbank-order-1');
  assert.equal(result.paymentStatus, PaymentStatus.PENDING);
});

test('applies an approved gateway status and returns a paid-order notification', async (): Promise<void> => {
  const order = createFakeOrder({
    status: OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
  });
  const flushes: string[] = [];
  const repository = new MikroOrmPaymentOrderRepository(createFakeEntityManager(order, flushes));

  const result = await repository.applyGatewayStatus({
    orderId: 'order-1',
    paymentId: 'pagbank-order-1',
    status: 'approved',
  });

  assert.equal(order.paymentId, 'pagbank-order-1');
  assert.equal(order.paymentStatus, PaymentStatus.APPROVED);
  assert.equal(order.status, OrderStatus.PAID);
  assert.deepEqual(flushes, ['flush']);
  assert.equal(result.order.status, OrderStatus.PAID);
  assert.deepEqual(result.newOrderNotification, {
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
        extras: [{ name: 'Extra', price: 2 }],
      },
    ],
    createdAt: '2026-05-08T15:00:00.000Z',
  });
});

test('applies a rejected gateway status without a new-order notification', async (): Promise<void> => {
  const order = createFakeOrder({
    status: OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
  });
  const repository = new MikroOrmPaymentOrderRepository(createFakeEntityManager(order));

  const result = await repository.applyGatewayStatus({
    orderId: 'order-1',
    status: 'rejected',
  });

  assert.equal(order.paymentStatus, PaymentStatus.REJECTED);
  assert.equal(order.status, OrderStatus.PENDING_PAYMENT);
  assert.equal(result.newOrderNotification, null);
});

test('applies queued approved payment results by payment id', async (): Promise<void> => {
  const order = createFakeOrder({
    paymentId: 'pagbank-order-1',
    status: OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
  });
  const flushes: string[] = [];
  const repository = new MikroOrmPaymentOrderRepository(createFakeEntityManager(order, flushes));

  const result = await repository.applyQueuedPaymentResult({
    paymentId: 'pagbank-order-1',
    status: 'approved',
  });

  assertProcessed(result);
  assert.equal(result.processed, true);
  assert.equal(result.status, 'approved');
  assert.equal(order.paymentStatus, PaymentStatus.APPROVED);
  assert.equal(order.status, OrderStatus.PAID);
  assert.deepEqual(flushes, ['flush']);
  assert.equal(result.newOrderNotification?.id, 'order-1');
});

test('falls back to reference id for queued charge payment results', async (): Promise<void> => {
  const order = createFakeOrder({
    paymentId: undefined,
    status: OrderStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
  });
  const flushes: string[] = [];
  const repository = new MikroOrmPaymentOrderRepository(createFakeEntityManager(order, flushes));

  const result = await repository.applyQueuedPaymentResult({
    paymentId: 'CHAR_1',
    referenceId: 'order-1',
    status: 'rejected',
  });

  assertProcessed(result);
  assert.equal(result.processed, true);
  assert.equal(result.status, 'rejected');
  assert.equal(order.paymentId, undefined);
  assert.equal(order.paymentStatus, PaymentStatus.REJECTED);
  assert.equal(order.status, OrderStatus.PENDING_PAYMENT);
  assert.deepEqual(flushes, ['flush']);
  assert.equal(result.newOrderNotification, null);
});

test('skips already approved queued payment results idempotently', async (): Promise<void> => {
  const order = createFakeOrder({
    paymentId: 'pagbank-order-1',
    status: OrderStatus.PAID,
    paymentStatus: PaymentStatus.APPROVED,
  });
  const flushes: string[] = [];
  const repository = new MikroOrmPaymentOrderRepository(createFakeEntityManager(order, flushes));

  const result = await repository.applyQueuedPaymentResult({
    paymentId: 'pagbank-order-1',
    status: 'approved',
  });

  assertSkipped(result);
  assert.deepEqual(result, {
    order: await repository.findById({ orderId: 'order-1' }),
    skipped: true,
  });
  assert.deepEqual(flushes, []);
});

test('skips terminal orders for queued payment results', async (): Promise<void> => {
  const order = createFakeOrder({
    paymentId: 'pagbank-order-1',
    status: OrderStatus.CANCELLED,
    paymentStatus: PaymentStatus.PENDING,
  });
  const flushes: string[] = [];
  const repository = new MikroOrmPaymentOrderRepository(createFakeEntityManager(order, flushes));

  const result = await repository.applyQueuedPaymentResult({
    paymentId: 'pagbank-order-1',
    status: 'approved',
  });

  assertSkipped(result);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'Order already in terminal state: cancelled');
  assert.deepEqual(flushes, []);
});

function createFakeEntityManager(order: Order | null, flushes: string[] = []): EntityManager {
  return {
    async findOne(entity: unknown, where: FindOneWhere): Promise<Order | null> {
      assert.equal(entity, Order);
      if (!order) {
        return null;
      }
      if (where.id && where.id === order.id) {
        return order;
      }
      if (where.paymentId && where.paymentId === order.paymentId) {
        return order;
      }
      return null;
    },
    async flush(): Promise<void> {
      flushes.push('flush');
    },
  } as unknown as EntityManager;
}

function assertProcessed(
  result: ApplyQueuedPaymentResultResult,
): asserts result is Extract<ApplyQueuedPaymentResultResult, { readonly processed: true }> {
  if (!('processed' in result)) {
    assert.fail('Expected queued payment result to be processed');
  }
}

function assertSkipped(
  result: ApplyQueuedPaymentResultResult,
): asserts result is Extract<ApplyQueuedPaymentResultResult, { readonly skipped: true }> {
  if (!('skipped' in result)) {
    assert.fail('Expected queued payment result to be skipped');
  }
}

function createFakeOrder(options: FakeOrderOptions = {}): Order {
  const items = options.items ?? [
    {
      productName: 'Quentinha P',
      quantity: 1,
      subtotal: '29.90',
      extras: [{ name: 'Extra', price: 2 }],
    },
  ];

  return {
    id: options.id ?? 'order-1',
    orderNumber: 42,
    customerName: 'Cliente Teste',
    customerPhone: '81999999999',
    customerEmail: 'cliente@example.com',
    status: options.status ?? OrderStatus.PENDING_PAYMENT,
    totalAmount: '29.90',
    paymentMethod: PaymentMethod.PIX,
    paymentStatus: options.paymentStatus,
    paymentId: options.paymentId,
    deliveryAddress: {
      cep: '50000000',
      street: 'Rua Teste',
      number: '123',
      neighborhood: 'Centro',
      city: 'Recife',
      state: 'PE',
    },
    items: {
      getItems(): readonly FakeOrderItem[] {
        return items;
      },
    },
    createdAt: options.createdAt ?? new Date('2026-05-08T15:00:00.000Z'),
    updatedAt: options.updatedAt ?? new Date('2026-05-08T15:01:00.000Z'),
  } as unknown as Order;
}
