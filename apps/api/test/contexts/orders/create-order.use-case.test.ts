import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod } from '@cardapio/shared';
import {
  CreateOrderNotFoundError,
  CreateOrderUseCase,
  CreateOrderValidationError,
  type CreateOrderCommand,
} from '../../../src/modules/orders/application/use-cases/create-order.use-case';
import type { OrderCouponUsageRepository, RecordOrderCouponUsageCommand } from '../../../src/modules/orders/application/ports/order-coupon-usage.port';
import type {
  OrderCouponValidationResult,
  OrderCouponValidator,
  ValidateOrderCouponCommand,
} from '../../../src/modules/orders/application/ports/order-coupon.port';
import type {
  CreateOrderPersistenceCommand,
  CreateOrderPersistenceResult,
  OrderCreationRepository,
} from '../../../src/modules/orders/application/ports/order-creation.repository.port';
import type {
  OrderCreatedReport,
  OrderCreationReporter,
} from '../../../src/modules/orders/application/ports/order-creation-reporter.port';
import type {
  FindOrCreateOrderCustomerCommand,
  OrderCustomerModel,
  OrderCustomerRepository,
} from '../../../src/modules/orders/application/ports/order-customer.port';
import type {
  OrderDeliveryAreaModel,
  OrderDeliveryAreaRepository,
} from '../../../src/modules/orders/application/ports/order-delivery-area.port';
import type {
  DebitOrderLoyaltyRedemptionCommand,
  OrderLoyaltyRedemptionRepository,
  RecordOrderLoyaltyRedemptionCommand,
} from '../../../src/modules/orders/application/ports/order-loyalty-redemption.port';
import type {
  FindOrderableProductsQuery,
  OrderableProductModel,
  OrderProductCatalogRepository,
} from '../../../src/modules/orders/application/ports/order-product-catalog.port';
import type { OrderSequenceRepository } from '../../../src/modules/orders/application/ports/order-sequence.port';
import type {
  OrderStoreAvailabilityChecker,
  OrderStoreAvailabilityResult,
  CheckOrderStoreAvailabilityQuery,
} from '../../../src/modules/orders/application/ports/order-store-availability.port';
import type { OrderReadModel } from '../../../src/modules/orders/application/read-models/order.read-model';
import type { Clock } from '../../../src/shared/application/clock/clock.port';
import type {
  TransactionContext,
  TransactionWork,
  UnitOfWork,
} from '../../../src/shared/application/unit-of-work/unit-of-work.port';

type Harness = {
  readonly calls: string[];
  readonly couponUsageRepository: FakeOrderCouponUsageRepository;
  readonly creationRepository: FakeOrderCreationRepository;
  readonly customerRepository: FakeOrderCustomerRepository;
  readonly loyaltyRedemptionRepository: FakeOrderLoyaltyRedemptionRepository;
  readonly productCatalogRepository: FakeOrderProductCatalogRepository;
  readonly reporter: FakeOrderCreationReporter;
  readonly useCase: CreateOrderUseCase;
};

const fakeTransactionContext: TransactionContext = {
  contextName: 'create-order-test-transaction',
};

test('creates the order inside a unit of work and reports only after commit', async (): Promise<void> => {
  const harness = createHarness();

  const result = await harness.useCase.execute(createCommand());

  assert.equal(result.customerToken, 'customer-token-1');
  assert.equal(result.id, 'order-1');
  assert.equal(result.orderNumber, 77);
  assert.equal(result.totalAmount, 18);
  assert.deepEqual(harness.calls, [
    'uow:start',
    'store:check',
    'customers:find-or-create',
    'products:paid',
    'sequence:next',
    'delivery-areas:find',
    'coupons:validate',
    'products:redeem',
    'loyalty:debit',
    'orders:create',
    'loyalty:record',
    'coupons:usage',
    'uow:commit',
    'reporter:created',
  ]);

  assert.deepEqual(harness.customerRepository.commands, [
    {
      context: fakeTransactionContext,
      customerToken: 'incoming-customer-token',
      phone: '81999999999',
      name: 'Cliente Teste',
    },
  ]);
  assert.deepEqual(harness.productCatalogRepository.queries.map((query) => ({
    context: query.context,
    ids: query.ids,
    includeComposition: query.includeComposition,
  })), [
    {
      context: fakeTransactionContext,
      ids: ['paid-product-1'],
      includeComposition: true,
    },
    {
      context: fakeTransactionContext,
      ids: ['redeem-product-1'],
      includeComposition: false,
    },
  ]);

  const persistenceCommand = harness.creationRepository.commands[0];
  assert.ok(persistenceCommand);
  assert.equal(persistenceCommand.context, fakeTransactionContext);
  assert.equal(persistenceCommand.orderNumber, 77);
  assert.equal(persistenceCommand.customerId, 'customer-1');
  assert.equal(persistenceCommand.totalAmount, '18.00');
  assert.equal(persistenceCommand.deliveryFee, '3.00');
  assert.equal(persistenceCommand.couponId, 'coupon-1');
  assert.equal(persistenceCommand.couponCode, 'CODEX');
  assert.equal(persistenceCommand.discountAmount, '2.00');
  assert.equal(persistenceCommand.pointsSpent, 1);
  assert.equal(persistenceCommand.status, OrderStatus.PENDING_PAYMENT);
  assert.equal(persistenceCommand.items.length, 2);
  assert.deepEqual(persistenceCommand.items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    unitPrice: item.unitPrice,
    subtotal: item.subtotal,
    isRedeemed: item.isRedeemed,
    pointsSpent: item.pointsSpent,
  })), [
    {
      productId: 'paid-product-1',
      productName: 'Quentinha P',
      unitPrice: '17.00',
      subtotal: '17.00',
      isRedeemed: false,
      pointsSpent: 0,
    },
    {
      productId: 'redeem-product-1',
      productName: 'Sobremesa Fidelidade',
      unitPrice: '0.00',
      subtotal: '0.00',
      isRedeemed: true,
      pointsSpent: 1,
    },
  ]);

  assert.deepEqual(harness.loyaltyRedemptionRepository.debits, [
    {
      context: fakeTransactionContext,
      customerId: 'customer-1',
      points: 1,
    },
  ]);
  assert.deepEqual(harness.loyaltyRedemptionRepository.records, [
    {
      context: fakeTransactionContext,
      customerId: 'customer-1',
      orderId: 'order-1',
      orderNumber: 77,
      points: 1,
    },
  ]);
  assert.deepEqual(harness.couponUsageRepository.commands, [
    {
      context: fakeTransactionContext,
      couponId: 'coupon-1',
      customerId: 'customer-1',
      orderId: 'order-1',
    },
  ]);
  assert.deepEqual(harness.reporter.reports, [
    {
      customerName: 'Cliente Teste',
      paymentMethod: PaymentMethod.PIX,
      orderNumber: 77,
      totalAmount: '18.00',
    },
  ]);
});

test('rolls back before persistence when the store is closed', async (): Promise<void> => {
  const harness = createHarness({
    storeAvailability: {
      open: false,
      reason: 'Restaurante fechado',
    },
  });

  await assert.rejects(
    () => harness.useCase.execute(createCommand()),
    CreateOrderValidationError,
  );

  assert.deepEqual(harness.calls, [
    'uow:start',
    'store:check',
    'uow:rollback',
  ]);
  assert.deepEqual(harness.creationRepository.commands, []);
  assert.deepEqual(harness.reporter.reports, []);
});

test('rolls back when a paid product cannot be found', async (): Promise<void> => {
  const harness = createHarness({
    products: [redeemableProduct()],
  });

  await assert.rejects(
    () => harness.useCase.execute(createCommand()),
    CreateOrderNotFoundError,
  );

  assert.deepEqual(harness.calls, [
    'uow:start',
    'store:check',
    'customers:find-or-create',
    'products:paid',
    'uow:rollback',
  ]);
  assert.deepEqual(harness.creationRepository.commands, []);
  assert.deepEqual(harness.reporter.reports, []);
});

function createHarness(options: {
  readonly couponValidation?: OrderCouponValidationResult;
  readonly customer?: OrderCustomerModel;
  readonly products?: readonly OrderableProductModel[];
  readonly storeAvailability?: OrderStoreAvailabilityResult;
} = {}): Harness {
  const calls: string[] = [];
  const unitOfWork = new FakeUnitOfWork(calls);
  const clock: Clock = {
    now: (): Date => new Date('2026-05-07T12:00:00.000Z'),
  };
  const storeAvailabilityChecker = new FakeOrderStoreAvailabilityChecker(
    calls,
    options.storeAvailability ?? { open: true },
  );
  const productCatalogRepository = new FakeOrderProductCatalogRepository(
    calls,
    options.products ?? [paidProduct(), redeemableProduct()],
  );
  const sequenceRepository = new FakeOrderSequenceRepository(calls);
  const deliveryAreaRepository = new FakeOrderDeliveryAreaRepository(calls);
  const customerRepository = new FakeOrderCustomerRepository(calls, options.customer ?? sampleCustomer);
  const creationRepository = new FakeOrderCreationRepository(calls);
  const couponValidator = new FakeOrderCouponValidator(calls, options.couponValidation ?? sampleCouponValidation);
  const couponUsageRepository = new FakeOrderCouponUsageRepository(calls);
  const loyaltyRedemptionRepository = new FakeOrderLoyaltyRedemptionRepository(calls);
  const reporter = new FakeOrderCreationReporter(calls);
  const useCase = new CreateOrderUseCase(
    unitOfWork,
    clock,
    storeAvailabilityChecker,
    productCatalogRepository,
    sequenceRepository,
    deliveryAreaRepository,
    customerRepository,
    creationRepository,
    couponValidator,
    couponUsageRepository,
    loyaltyRedemptionRepository,
    reporter,
  );

  return {
    calls,
    couponUsageRepository,
    creationRepository,
    customerRepository,
    loyaltyRedemptionRepository,
    productCatalogRepository,
    reporter,
    useCase,
  };
}

class FakeUnitOfWork implements UnitOfWork {
  public constructor(private readonly calls: string[]) {}

  public async run<T>(work: TransactionWork<T>): Promise<T> {
    this.calls.push('uow:start');

    try {
      const result = await work(fakeTransactionContext);
      this.calls.push('uow:commit');
      return result;
    } catch (error: unknown) {
      this.calls.push('uow:rollback');
      throw error;
    }
  }
}

class FakeOrderStoreAvailabilityChecker implements OrderStoreAvailabilityChecker {
  public readonly queries: CheckOrderStoreAvailabilityQuery[] = [];

  public constructor(
    private readonly calls: string[],
    private readonly result: OrderStoreAvailabilityResult,
  ) {}

  public async check(query: CheckOrderStoreAvailabilityQuery): Promise<OrderStoreAvailabilityResult> {
    this.calls.push('store:check');
    this.queries.push(query);
    return this.result;
  }
}

class FakeOrderProductCatalogRepository implements OrderProductCatalogRepository {
  public readonly queries: FindOrderableProductsQuery[] = [];
  private readonly productsById: ReadonlyMap<string, OrderableProductModel>;

  public constructor(
    private readonly calls: string[],
    products: readonly OrderableProductModel[],
  ) {
    this.productsById = new Map(products.map((product) => [product.id, product]));
  }

  public async findOrderableProducts(
    query: FindOrderableProductsQuery,
  ): Promise<readonly OrderableProductModel[]> {
    assert.equal(query.context, fakeTransactionContext);
    this.calls.push(query.includeComposition ? 'products:paid' : 'products:redeem');
    this.queries.push(query);

    return query.ids.flatMap((id) => {
      const product = this.productsById.get(id);
      return product ? [product] : [];
    });
  }
}

class FakeOrderSequenceRepository implements OrderSequenceRepository {
  public constructor(private readonly calls: string[]) {}

  public async nextDailySequence(context?: TransactionContext): Promise<number> {
    assert.equal(context, fakeTransactionContext);
    this.calls.push('sequence:next');
    return 77;
  }
}

class FakeOrderDeliveryAreaRepository implements OrderDeliveryAreaRepository {
  public constructor(private readonly calls: string[]) {}

  public async findActiveById(id: string, context?: TransactionContext): Promise<OrderDeliveryAreaModel | null> {
    assert.equal(context, fakeTransactionContext);
    this.calls.push('delivery-areas:find');

    if (id !== 'delivery-area-1') {
      return null;
    }

    return {
      id,
      feeAmount: '3.00',
      feeCents: 300,
    };
  }
}

class FakeOrderCustomerRepository implements OrderCustomerRepository {
  public readonly commands: FindOrCreateOrderCustomerCommand[] = [];

  public constructor(
    private readonly calls: string[],
    private readonly customer: OrderCustomerModel,
  ) {}

  public async findOrCreateForOrder(
    command: FindOrCreateOrderCustomerCommand,
  ): Promise<OrderCustomerModel> {
    assert.equal(command.context, fakeTransactionContext);
    this.calls.push('customers:find-or-create');
    this.commands.push(command);
    return this.customer;
  }
}

class FakeOrderCreationRepository implements OrderCreationRepository {
  public readonly commands: CreateOrderPersistenceCommand[] = [];

  public constructor(private readonly calls: string[]) {}

  public async create(command: CreateOrderPersistenceCommand): Promise<CreateOrderPersistenceResult> {
    assert.equal(command.context, fakeTransactionContext);
    this.calls.push('orders:create');
    this.commands.push(command);

    return {
      orderId: 'order-1',
      orderNumber: command.orderNumber,
      order: createOrderReadModel(command),
    };
  }
}

class FakeOrderCouponValidator implements OrderCouponValidator {
  public readonly commands: ValidateOrderCouponCommand[] = [];

  public constructor(
    private readonly calls: string[],
    private readonly result: OrderCouponValidationResult,
  ) {}

  public async validate(command: ValidateOrderCouponCommand): Promise<OrderCouponValidationResult> {
    this.calls.push('coupons:validate');
    this.commands.push(command);
    return this.result;
  }
}

class FakeOrderCouponUsageRepository implements OrderCouponUsageRepository {
  public readonly commands: RecordOrderCouponUsageCommand[] = [];

  public constructor(private readonly calls: string[]) {}

  public async recordUsage(command: RecordOrderCouponUsageCommand): Promise<void> {
    assert.equal(command.context, fakeTransactionContext);
    this.calls.push('coupons:usage');
    this.commands.push(command);
  }
}

class FakeOrderLoyaltyRedemptionRepository implements OrderLoyaltyRedemptionRepository {
  public readonly debits: DebitOrderLoyaltyRedemptionCommand[] = [];
  public readonly records: RecordOrderLoyaltyRedemptionCommand[] = [];

  public constructor(private readonly calls: string[]) {}

  public async debitPoints(
    command: DebitOrderLoyaltyRedemptionCommand,
  ): Promise<{ readonly debited: boolean }> {
    assert.equal(command.context, fakeTransactionContext);
    this.calls.push('loyalty:debit');
    this.debits.push(command);

    return {
      debited: true,
    };
  }

  public async recordRedemption(command: RecordOrderLoyaltyRedemptionCommand): Promise<void> {
    assert.equal(command.context, fakeTransactionContext);
    this.calls.push('loyalty:record');
    this.records.push(command);
  }
}

class FakeOrderCreationReporter implements OrderCreationReporter {
  public readonly reports: OrderCreatedReport[] = [];

  public constructor(private readonly calls: string[]) {}

  public async orderCreated(report: OrderCreatedReport): Promise<void> {
    this.calls.push('reporter:created');
    this.reports.push(report);
  }
}

const sampleCustomer: OrderCustomerModel = {
  id: 'customer-1',
  loyaltyPoints: 10,
  token: 'customer-token-1',
};

const sampleCouponValidation: OrderCouponValidationResult = {
  valid: true,
  coupon: {
    id: 'coupon-1',
    code: 'CODEX',
  },
  discountCents: 200,
  discountAmount: '2.00',
};

function createCommand(): CreateOrderCommand {
  return {
    customerName: 'Cliente Teste',
    customerPhone: '81999999999',
    customerEmail: 'cliente@example.com',
    customerToken: 'incoming-customer-token',
    deliveryType: 'delivery',
    deliveryAreaId: 'delivery-area-1',
    deliveryAddress: {
      cep: '50000000',
      city: 'Recife',
      neighborhood: 'Boa Viagem',
      number: '123',
      state: 'PE',
      street: 'Rua Teste',
    },
    items: [
      {
        productId: 'paid-product-1',
        quantity: 1,
      },
    ],
    couponCode: 'CODEX',
    notes: 'Sem cebola',
    paymentMethod: PaymentMethod.PIX,
    redeemedItems: [
      {
        productId: 'redeem-product-1',
      },
    ],
    scheduledFor: '2026-05-08T15:00:00.000Z',
  };
}

function paidProduct(): OrderableProductModel {
  return {
    id: 'paid-product-1',
    name: 'Quentinha P',
    category: {
      availabilitySchedule: null,
    },
    extras: [],
    isActive: true,
    isCompound: false,
    isRedeemable: false,
    optionGroups: [],
    price: '17.00',
  };
}

function redeemableProduct(): OrderableProductModel {
  return {
    id: 'redeem-product-1',
    name: 'Sobremesa Fidelidade',
    category: {
      availabilitySchedule: null,
    },
    extras: [],
    isActive: true,
    isCompound: false,
    isRedeemable: true,
    optionGroups: [],
    price: '0.00',
    redemptionCost: 1,
  };
}

function createOrderReadModel(command: CreateOrderPersistenceCommand): OrderReadModel {
  return {
    id: 'order-1',
    orderNumber: command.orderNumber,
    customerName: command.customerName,
    customerPhone: command.customerPhone,
    status: command.status,
    totalAmount: Number(command.totalAmount),
    couponCode: command.couponCode ?? null,
    discountAmount: command.discountAmount ? Number(command.discountAmount) : null,
    deliveryAddress: command.deliveryAddress,
    deliveryFee: command.deliveryFee ? Number(command.deliveryFee) : null,
    paymentMethod: command.paymentMethod,
    deliveryType: command.deliveryType,
    notes: command.notes,
    scheduledFor: command.scheduledFor ? command.scheduledFor.toISOString() : null,
    items: command.items.map((item, index) => ({
      id: `item-${index + 1}`,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      extras: item.extras,
      groupedExtras: item.groupedExtras,
    })),
    createdAt: '2026-05-07T12:00:00.000Z',
    updatedAt: '2026-05-07T12:00:00.000Z',
  };
}
