import { OrderStatus, PaymentMethod } from '@cardapio/shared';
import type { Clock } from '../../../../shared/application/clock/clock.port';
import type {
  TransactionContext,
  UnitOfWork,
} from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { LoyaltyPointsPolicy } from '../../../../shared/domain/loyalty-points.policy';
import { ProductPricePolicy } from '../../../../shared/domain/product-price.policy';
import {
  OrderCreationDraft,
  type OrderCreationDraftItem,
  type OrderCreationRedeemedItemInput,
} from '../../domain/order-creation-draft.value-object';
import {
  InvalidOrderDeliveryFeeError,
  OrderDeliveryFeePolicy,
  type OrderDeliveryFeeResolution,
} from '../../domain/order-delivery-fee.policy';
import {
  InvalidOrderItemSnapshotError,
  OrderItemSnapshotPolicy,
  type OrderItemSnapshot,
  type OrderItemSnapshotProductInput,
} from '../../domain/order-item-snapshot.policy';
import {
  InvalidOrderProductAvailabilityError,
  OrderProductAvailabilityPolicy,
} from '../../domain/order-product-availability.policy';
import { ScheduledOrderPolicy, type ScheduledOrderResolution } from '../../domain/scheduled-order.policy';
import type {
  CreateOrderItemPersistenceInput,
  OrderCreationRepository,
} from '../ports/order-creation.repository.port';
import type { OrderCouponValidationSuccess, OrderCouponValidator } from '../ports/order-coupon.port';
import type { OrderCouponUsageRepository } from '../ports/order-coupon-usage.port';
import type { OrderCreationReporter, OrderCreatedReport } from '../ports/order-creation-reporter.port';
import type {
  OrderCustomerModel,
  OrderCustomerRepository,
} from '../ports/order-customer.port';
import type {
  OrderDeliveryAreaModel,
  OrderDeliveryAreaRepository,
} from '../ports/order-delivery-area.port';
import type { OrderLoyaltyRedemptionRepository } from '../ports/order-loyalty-redemption.port';
import type {
  OrderableProductModel,
  OrderProductCatalogRepository,
} from '../ports/order-product-catalog.port';
import type { OrderSequenceRepository } from '../ports/order-sequence.port';
import type { OrderStoreAvailabilityChecker } from '../ports/order-store-availability.port';
import type { OrderReadModel } from '../read-models/order.read-model';

export type CreateOrderOptionSelectionCommand = {
  readonly groupId: string;
  readonly optionIds: readonly string[];
};

export type CreateOrderItemCommand = {
  readonly extraIds?: readonly string[];
  readonly optionSelections?: readonly CreateOrderOptionSelectionCommand[];
  readonly productId: string;
  readonly quantity: number;
};

export type CreateOrderRedeemedItemCommand = {
  readonly productId: string;
};

export type CreateOrderDeliveryAddressCommand = {
  readonly cep: string;
  readonly city: string;
  readonly complement?: string;
  readonly neighborhood: string;
  readonly number: string;
  readonly state: string;
  readonly street: string;
};

export type CreateOrderCommand = {
  readonly couponCode?: string;
  readonly customerEmail?: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerToken?: string;
  readonly deliveryAddress?: CreateOrderDeliveryAddressCommand;
  readonly deliveryAreaId?: string;
  readonly deliveryType: 'pickup' | 'delivery';
  readonly items: readonly CreateOrderItemCommand[];
  readonly notes?: string;
  readonly paymentMethod: PaymentMethod;
  readonly redeemedItems?: readonly CreateOrderRedeemedItemCommand[];
  readonly scheduledFor?: string | null;
};

export type CreateOrderResult = OrderReadModel & {
  readonly customerToken: string;
};

type CreateOrderExecution = {
  readonly report: OrderCreatedReport;
  readonly result: CreateOrderResult;
};

export class CreateOrderValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CreateOrderValidationError';
  }
}

export class CreateOrderNotFoundError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CreateOrderNotFoundError';
  }
}

export class CreateOrderUseCase {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
    private readonly orderStoreAvailabilityChecker: OrderStoreAvailabilityChecker,
    private readonly productCatalogRepository: OrderProductCatalogRepository,
    private readonly orderSequenceRepository: OrderSequenceRepository,
    private readonly orderDeliveryAreaRepository: OrderDeliveryAreaRepository,
    private readonly orderCustomerRepository: OrderCustomerRepository,
    private readonly orderCreationRepository: OrderCreationRepository,
    private readonly orderCouponValidator: OrderCouponValidator,
    private readonly orderCouponUsageRepository: OrderCouponUsageRepository,
    private readonly orderLoyaltyRedemptionRepository: OrderLoyaltyRedemptionRepository,
    private readonly orderCreationReporter: OrderCreationReporter,
  ) {}

  public async execute(command: CreateOrderCommand): Promise<CreateOrderResult> {
    const execution = await this.unitOfWork.run((context) => this.createInsideTransaction(command, context));
    await this.orderCreationReporter.orderCreated(execution.report);

    return execution.result;
  }

  private async createInsideTransaction(
    command: CreateOrderCommand,
    context: TransactionContext,
  ): Promise<CreateOrderExecution> {
    const scheduledOrder = this.resolveScheduledOrder(command.scheduledFor);
    const scheduledFor = scheduledOrder.scheduledFor;
    const targetDate = scheduledOrder.targetDate;
    await this.assertStoreCanAcceptOrder(scheduledFor);

    const customer = await this.orderCustomerRepository.findOrCreateForOrder({
      context,
      customerToken: command.customerToken ?? null,
      phone: command.customerPhone,
      name: command.customerName,
    });

    const products = await this.productCatalogRepository.findOrderableProducts({
      context,
      ids: command.items.map((item) => item.productId),
      includeComposition: true,
    });

    this.assertPaidProductsAvailable(command.items, products, targetDate);

    let draft = OrderCreationDraft.empty();

    const orderNumber = await this.orderSequenceRepository.nextDailySequence(context);

    for (const item of command.items) {
      const product = this.findPaidProduct(products, item.productId);
      const snapshot = this.createOrderItemSnapshot(product, item);
      draft = draft.addPaidItem(snapshot);
    }

    const deliveryFee = await this.resolveDeliveryFee(command, context);
    draft = draft.applyDeliveryFee(deliveryFee);

    const appliedCoupon = await this.validateCoupon(command);
    if (appliedCoupon) {
      draft = draft.applyCouponDiscount(appliedCoupon.discountCents);
    }

    const redeemedItems = await this.resolveRedemption(command, customer, targetDate, context);
    for (const redeemedItem of redeemedItems) {
      draft = draft.addRedeemedItem(redeemedItem);
    }
    const pointsSpent = draft.pointsSpent();
    const totalAmount = draft.totalAmount();

    const createdOrder = await this.orderCreationRepository.create({
      context,
      orderNumber,
      customerId: customer.id,
      customerName: command.customerName,
      customerPhone: command.customerPhone,
      customerEmail: command.customerEmail,
      paymentMethod: command.paymentMethod,
      deliveryType: this.deliveryType(command),
      deliveryAddress: command.deliveryAddress,
      notes: command.notes,
      scheduledFor: scheduledFor ?? undefined,
      status: OrderStatus.PENDING_PAYMENT,
      totalAmount,
      deliveryFee: deliveryFee.feeAmount ?? undefined,
      couponId: appliedCoupon?.coupon.id,
      couponCode: appliedCoupon?.coupon.code,
      discountAmount: appliedCoupon?.discountAmount,
      pointsSpent,
      items: this.toPersistenceItems(draft.items()),
    });

    if (pointsSpent > 0) {
      await this.orderLoyaltyRedemptionRepository.recordRedemption({
        context,
        customerId: customer.id,
        orderId: createdOrder.orderId,
        orderNumber: createdOrder.orderNumber,
        points: pointsSpent,
      });
    }

    if (appliedCoupon) {
      await this.orderCouponUsageRepository.recordUsage({
        context,
        couponId: appliedCoupon.coupon.id,
        customerId: customer.id,
        orderId: createdOrder.orderId,
      });
    }

    return {
      report: {
        orderNumber,
        customerName: command.customerName,
        totalAmount,
        paymentMethod: command.paymentMethod,
      },
      result: {
        ...createdOrder.order,
        customerToken: customer.token,
      },
    };
  }

  private assertPaidProductsAvailable(
    items: readonly CreateOrderItemCommand[],
    products: readonly OrderableProductModel[],
    targetDate: Date,
  ): void {
    for (const item of items) {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) {
        throw new CreateOrderNotFoundError(`Product ${item.productId} not found`);
      }
      if (!product.isActive) {
        throw new CreateOrderValidationError(`Product ${product.name} is unavailable`);
      }
      this.assertProductAvailableAt(product, targetDate);
    }
  }

  private findPaidProduct(
    products: readonly OrderableProductModel[],
    productId: string,
  ): OrderableProductModel {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) {
      throw new CreateOrderNotFoundError(`Product ${productId} not found`);
    }

    return product;
  }

  private async validateCoupon(command: CreateOrderCommand): Promise<OrderCouponValidationSuccess | null> {
    if (!command.couponCode) {
      return null;
    }

    const couponValidation = await this.orderCouponValidator.validate({
      code: command.couponCode,
      items: command.items,
      deliveryType: this.deliveryType(command),
      customerPhone: command.customerPhone,
    });

    if (!couponValidation.valid) {
      throw new CreateOrderValidationError(couponValidation.reason);
    }

    return couponValidation;
  }

  private async resolveRedemption(
    command: CreateOrderCommand,
    customer: OrderCustomerModel,
    targetDate: Date,
    context: TransactionContext,
  ): Promise<readonly OrderCreationRedeemedItemInput[]> {
    if (!command.redeemedItems?.length) {
      return [];
    }

    const loyaltyPolicy = LoyaltyPointsPolicy.forBalance(customer.loyaltyPoints);
    const redeemProducts = await this.productCatalogRepository.findOrderableProducts({
      context,
      ids: command.redeemedItems.map((item) => item.productId),
      includeComposition: false,
    });
    const redeemedItems: OrderCreationRedeemedItemInput[] = [];
    let totalPointsSpent = 0;

    for (const redeemedItem of command.redeemedItems) {
      const product = redeemProducts.find((candidate) => candidate.id === redeemedItem.productId);
      if (!product) {
        throw new CreateOrderValidationError(`Produto resgatavel ${redeemedItem.productId} nao encontrado`);
      }
      if (!product.isRedeemable || !product.isActive) {
        throw new CreateOrderValidationError(`Produto ${product.name} nao esta disponivel para resgate`);
      }

      this.assertProductAvailableAt(product, targetDate);
      const redemptionCost = loyaltyPolicy.redemptionCost(product.redemptionCost);
      totalPointsSpent += redemptionCost;
      redeemedItems.push({
        productId: product.id,
        productName: product.name,
        pointsSpent: redemptionCost,
      });
    }

    if (totalPointsSpent > 0) {
      const debitResult = await this.orderLoyaltyRedemptionRepository.debitPoints({
        context,
        customerId: customer.id,
        points: totalPointsSpent,
      });
      if (!debitResult.debited) {
        throw new CreateOrderValidationError('Pontos de fidelidade insuficientes');
      }
    }

    return redeemedItems;
  }

  private toPersistenceItems(items: readonly OrderCreationDraftItem[]): CreateOrderItemPersistenceInput[] {
    return items.map((item) => this.toPersistenceItem(item));
  }

  private toPersistenceItem(item: OrderCreationDraftItem): CreateOrderItemPersistenceInput {
    return {
      productId: item.productId,
      productName: item.productName,
      unitPrice: this.centsToDecimal(item.unitPriceCents),
      quantity: item.quantity,
      subtotal: this.centsToDecimal(item.subtotalCents),
      extras: item.extras,
      groupedExtras: item.groupedExtras,
      isRedeemed: item.isRedeemed,
      pointsSpent: item.pointsSpent,
    };
  }

  private createOrderItemSnapshot(
    product: OrderableProductModel,
    item: CreateOrderItemCommand,
  ): OrderItemSnapshot {
    try {
      return OrderItemSnapshotPolicy.for(this.toOrderItemSnapshotProduct(product), item).createSnapshot();
    } catch (error: unknown) {
      if (error instanceof InvalidOrderItemSnapshotError) {
        throw new CreateOrderValidationError(error.message);
      }

      throw error;
    }
  }

  private toOrderItemSnapshotProduct(product: OrderableProductModel): OrderItemSnapshotProductInput {
    return {
      id: product.id,
      name: product.name,
      baseUnitPriceCents: this.decimalToCents(ProductPricePolicy.create(product).effectivePrice()),
      isActive: product.isActive,
      isCompound: product.isCompound,
      extras: product.extras,
      optionGroups: product.optionGroups,
    };
  }

  private async resolveDeliveryFee(
    command: CreateOrderCommand,
    context: TransactionContext,
  ): Promise<OrderDeliveryFeeResolution> {
    const policy = OrderDeliveryFeePolicy.for({
      deliveryType: this.deliveryType(command),
      deliveryAreaId: command.deliveryAreaId ?? null,
    });

    try {
      const deliveryAreaId = policy.requestedDeliveryAreaId();
      const deliveryArea = await this.findActiveDeliveryArea(deliveryAreaId, context);

      return policy.resolve(deliveryArea);
    } catch (error: unknown) {
      if (error instanceof InvalidOrderDeliveryFeeError) {
        throw new CreateOrderValidationError(error.message);
      }

      throw error;
    }
  }

  private async findActiveDeliveryArea(
    id: string | null,
    context: TransactionContext,
  ): Promise<OrderDeliveryAreaModel | null> {
    if (!id) {
      return null;
    }

    return this.orderDeliveryAreaRepository.findActiveById(id, context);
  }

  private resolveScheduledOrder(value?: string | null): ScheduledOrderResolution {
    const result = ScheduledOrderPolicy.at(this.clock.now()).resolve(value);

    if (!result.valid) {
      throw new CreateOrderValidationError(result.message);
    }

    return result;
  }

  private async assertStoreCanAcceptOrder(scheduledFor: Date | null): Promise<void> {
    const status = await this.orderStoreAvailabilityChecker.check({ scheduledFor });

    if (!status.open) {
      throw new CreateOrderValidationError(status.reason || 'Restaurante fechado no horário selecionado');
    }
  }

  private assertProductAvailableAt(product: OrderableProductModel, at: Date): void {
    try {
      OrderProductAvailabilityPolicy.for({
        name: product.name,
        categoryAvailabilitySchedule: product.category.availabilitySchedule,
      }, at).assertAvailable();
    } catch (error: unknown) {
      if (error instanceof InvalidOrderProductAvailabilityError) {
        throw new CreateOrderValidationError(error.message);
      }

      throw error;
    }
  }

  private deliveryType(command: CreateOrderCommand): 'pickup' | 'delivery' {
    return command.deliveryType || 'pickup';
  }

  private centsToDecimal(value: number): string {
    return (value / 100).toFixed(2);
  }

  private decimalToCents(value: string): number {
    return Math.round(Number.parseFloat(value) * 100);
  }
}
