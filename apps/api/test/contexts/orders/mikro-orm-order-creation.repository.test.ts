import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityManager } from '@mikro-orm/postgresql';
import { OrderStatus, PaymentMethod } from '@cardapio/shared';
import { Coupon, Customer, Order, OrderItem } from '../../../src/entities';
import { MikroOrmOrderCreationRepository } from '../../../src/modules/orders/adapters/persistence/mikro-orm-order-creation.repository';
import { MikroOrmTransactionContext } from '../../../src/shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  CreateOrderDeliveryAddressInput,
  CreateOrderItemExtraInput,
  CreateOrderItemGroupedExtraInput,
  CreateOrderPersistenceCommand,
} from '../../../src/modules/orders/application/ports/order-creation.repository.port';

type EntityReference = {
  readonly entity: unknown;
  readonly id: string;
};

type CreatedEntity = {
  readonly entity: unknown;
  readonly payload: unknown;
};

type FakeOrderItem = {
  readonly extras?: readonly CreateOrderItemExtraInput[] | null;
  readonly groupedExtras?: readonly CreateOrderItemGroupedExtraInput[] | null;
  readonly id: string;
  readonly productName: string;
  readonly quantity: number;
  readonly subtotal: string;
  readonly unitPrice: string;
};

type FakeOrder = {
  readonly couponCode?: string;
  readonly createdAt: Date;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly deliveryAddress?: CreateOrderDeliveryAddressInput;
  readonly deliveryFee?: string;
  readonly deliveryType?: string;
  readonly discountAmount?: string;
  readonly id: string;
  readonly items: { getItems(): readonly FakeOrderItem[] };
  readonly notes?: string;
  readonly orderNumber: number;
  readonly paymentMethod: PaymentMethod;
  readonly scheduledFor?: Date;
  readonly status?: OrderStatus;
  readonly totalAmount: string;
  readonly updatedAt: Date;
};

type OrderCreatePayload = {
  readonly couponCode?: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly deliveryAddress?: CreateOrderDeliveryAddressInput;
  readonly deliveryFee?: string;
  readonly deliveryType?: string;
  readonly discountAmount?: string;
  readonly notes?: string;
  readonly orderNumber: number;
  readonly paymentMethod: PaymentMethod;
  readonly scheduledFor?: Date;
  readonly status?: OrderStatus;
  readonly totalAmount: string;
};

type PersistedOrderPayload = {
  readonly coupon?: EntityReference;
  readonly customer: EntityReference;
  readonly discountAmount?: string;
  readonly pointsSpent: number;
  readonly totalAmount: string;
};

type OrderItemCreatePayload = {
  readonly extras?: readonly CreateOrderItemExtraInput[] | null;
  readonly groupedExtras?: readonly CreateOrderItemGroupedExtraInput[] | null;
  readonly isRedeemed: boolean;
  readonly pointsSpent: number;
  readonly productName: string;
  readonly quantity: number;
  readonly subtotal: string;
  readonly unitPrice: string;
};

test('creates an order with paid and redeemed items and returns the read model', async (): Promise<void> => {
  const createdEntities: CreatedEntity[] = [];
  const references: EntityReference[] = [];
  const flushes: string[] = [];
  const repository = new MikroOrmOrderCreationRepository(createFakeEntityManager({
    createdEntities,
    flushes,
    references,
  }));

  const scheduledFor = new Date('2026-05-08T15:00:00.000Z');
  const result = await repository.create({
    orderNumber: 21,
    customerId: 'customer-1',
    customerName: 'Cliente Teste',
    customerPhone: '81999999999',
    customerEmail: 'cliente@example.com',
    paymentMethod: PaymentMethod.PIX,
    deliveryType: 'pickup',
    notes: 'Sem cebola',
    scheduledFor,
    status: OrderStatus.PENDING_PAYMENT,
    totalAmount: '17.00',
    couponId: 'coupon-1',
    couponCode: 'CODEX',
    discountAmount: '2.00',
    pointsSpent: 1,
    items: [
      {
        productId: 'product-1',
        productName: 'Quentinha P',
        unitPrice: '17.00',
        quantity: 1,
        subtotal: '17.00',
        extras: [{ name: 'Extra', price: 2 }],
        groupedExtras: [
          {
            groupId: 'group-1',
            groupName: 'Grupo',
            options: [{ name: 'Opcao', price: 1 }],
          },
        ],
        isRedeemed: false,
        pointsSpent: 0,
      },
      {
        productId: 'product-1',
        productName: 'Quentinha P',
        unitPrice: '0.00',
        quantity: 1,
        subtotal: '0.00',
        extras: [],
        groupedExtras: [],
        isRedeemed: true,
        pointsSpent: 1,
      },
    ],
  });

  assert.deepEqual(references, [
    { entity: Customer, id: 'customer-1' },
    { entity: Coupon, id: 'coupon-1' },
  ]);
  assert.equal(createdEntities[0]?.entity, Order);
  const orderPayload = createdEntities[0]?.payload as PersistedOrderPayload | undefined;
  assert.ok(orderPayload);
  assert.deepEqual(orderPayload.customer, { entity: Customer, id: 'customer-1' });
  assert.deepEqual(orderPayload.coupon, { entity: Coupon, id: 'coupon-1' });
  assert.equal(orderPayload.totalAmount, '17.00');
  assert.equal(orderPayload.discountAmount, '2.00');
  assert.equal(orderPayload.pointsSpent, 1);
  assert.equal(createdEntities[1]?.entity, OrderItem);
  assert.equal(createdEntities[2]?.entity, OrderItem);
  const paidItemPayload = createdEntities[1]?.payload as OrderItemCreatePayload | undefined;
  const redeemedItemPayload = createdEntities[2]?.payload as OrderItemCreatePayload | undefined;
  assert.ok(paidItemPayload);
  assert.ok(redeemedItemPayload);
  assert.equal(paidItemPayload.isRedeemed, false);
  assert.equal(paidItemPayload.pointsSpent, 0);
  assert.equal(redeemedItemPayload.isRedeemed, true);
  assert.equal(redeemedItemPayload.pointsSpent, 1);
  assert.deepEqual(flushes, ['flush']);
  assert.equal(result.orderId, 'order-1');
  assert.equal(result.orderNumber, 21);
  assert.equal(result.order.id, 'order-1');
  assert.equal(result.order.totalAmount, 17);
  assert.equal(result.order.discountAmount, 2);
  assert.equal(result.order.couponCode, 'CODEX');
  assert.equal(result.order.scheduledFor, scheduledFor.toISOString());
  assert.equal(result.order.items.length, 2);
  assert.equal(result.order.items[0]?.unitPrice, 17);
  assert.equal(result.order.items[1]?.unitPrice, 0);
});

test('creates an order through the provided transaction context', async (): Promise<void> => {
  const createdEntities: CreatedEntity[] = [];
  const references: EntityReference[] = [];
  const flushes: string[] = [];
  let forked = false;
  const transactionalEm = createDirectFakeEntityManager({
    createdEntities,
    flushes,
    references,
  });
  const rootEm = {
    fork(): EntityManager {
      forked = true;
      return transactionalEm;
    },
  } as unknown as EntityManager;
  const repository = new MikroOrmOrderCreationRepository(rootEm);

  const result = await repository.create({
    ...createMinimalOrderPersistenceCommand(),
    context: new MikroOrmTransactionContext(transactionalEm),
  });

  assert.equal(forked, false);
  assert.deepEqual(flushes, ['flush']);
  assert.deepEqual(references, [{ entity: Customer, id: 'customer-1' }]);
  assert.equal(createdEntities[0]?.entity, Order);
  assert.equal(createdEntities[1]?.entity, OrderItem);
  assert.equal(result.orderId, 'order-1');
  assert.equal(result.orderNumber, 22);
});

function createFakeEntityManager(options: {
  readonly createdEntities: CreatedEntity[];
  readonly flushes: string[];
  readonly references: EntityReference[];
}): EntityManager {
  const fork = createDirectFakeEntityManager(options);
  const em = {
    fork(): EntityManager {
      return fork;
    },
  } as unknown as EntityManager;

  return em;
}

function createDirectFakeEntityManager(options: {
  readonly createdEntities: CreatedEntity[];
  readonly flushes: string[];
  readonly references: EntityReference[];
}): EntityManager {
  const orderItems: FakeOrderItem[] = [];

  return {
    getReference(entity: unknown, id: string): EntityReference {
      const reference = { entity, id };
      options.references.push(reference);
      return reference;
    },
    create(entity: unknown, payload: unknown): unknown {
      options.createdEntities.push({ entity, payload });

      if (entity === Order) {
        return createFakeOrder(payload as OrderCreatePayload, orderItems);
      }

      if (entity === OrderItem) {
        const item = createFakeOrderItem(payload as OrderItemCreatePayload, orderItems.length + 1);
        orderItems.push(item);
        return item;
      }

      return payload;
    },
    async flush(): Promise<void> {
      options.flushes.push('flush');
    },
  } as unknown as EntityManager;
}

function createMinimalOrderPersistenceCommand(): CreateOrderPersistenceCommand {
  return {
    orderNumber: 22,
    customerId: 'customer-1',
    customerName: 'Cliente Teste',
    customerPhone: '81999999999',
    paymentMethod: PaymentMethod.PIX,
    deliveryType: 'pickup',
    status: OrderStatus.PENDING_PAYMENT,
    totalAmount: '17.00',
    pointsSpent: 0,
    items: [
      {
        productId: 'product-1',
        productName: 'Quentinha P',
        unitPrice: '17.00',
        quantity: 1,
        subtotal: '17.00',
        extras: [],
        groupedExtras: [],
        isRedeemed: false,
        pointsSpent: 0,
      },
    ],
  };
}

function createFakeOrder(payload: OrderCreatePayload, orderItems: readonly FakeOrderItem[]): Order {
  const order: FakeOrder = {
    id: 'order-1',
    orderNumber: payload.orderNumber,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    status: payload.status,
    totalAmount: payload.totalAmount,
    couponCode: payload.couponCode,
    discountAmount: payload.discountAmount,
    deliveryFee: payload.deliveryFee,
    paymentMethod: payload.paymentMethod,
    deliveryType: payload.deliveryType,
    deliveryAddress: payload.deliveryAddress,
    notes: payload.notes,
    scheduledFor: payload.scheduledFor,
    items: {
      getItems(): readonly FakeOrderItem[] {
        return orderItems;
      },
    },
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
    updatedAt: new Date('2026-05-07T12:00:00.000Z'),
  };

  return order as unknown as Order;
}

function createFakeOrderItem(payload: OrderItemCreatePayload, sequence: number): FakeOrderItem {
  return {
    id: `item-${sequence}`,
    productName: payload.productName,
    unitPrice: payload.unitPrice,
    quantity: payload.quantity,
    subtotal: payload.subtotal,
    extras: payload.extras,
    groupedExtras: payload.groupedExtras,
  };
}
