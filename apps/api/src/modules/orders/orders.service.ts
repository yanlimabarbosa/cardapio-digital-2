import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Order, OrderItem, Product, DeliveryArea, Customer, Coupon, CouponUsage, LoyaltyTransaction, StoreSettings } from '../../entities';
import { OrderStatus, PaymentMethod } from '@cardapio/shared';
import { CreateOrderDto } from './dto/create-order.dto';
import { KitchenGateway } from '../websocket/websocket.gateway';
import { StoreService } from '../store/store.service';
import { CustomersService } from '../customers/customers.service';
import { CouponsService } from '../coupons/coupons.service';
import { getEffectivePrice } from '../../utils/product-price';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly kitchenGateway: KitchenGateway,
    private readonly storeService: StoreService,
    private readonly customersService: CustomersService,
    private readonly couponsService: CouponsService,
  ) {}

  async create(dto: CreateOrderDto, customerToken?: string) {
    const storeStatus = await this.storeService.isOpen();
    if (!storeStatus.open) {
      throw new BadRequestException(storeStatus.reason || 'Restaurante fechado no momento');
    }

    const em = this.em.fork();

    // Resolve customer: by token first, fallback to findOrCreate by phone
    let customer: Customer;
    if (customerToken) {
      const found = await em.findOne(Customer, { token: customerToken, isActive: true });
      if (found) {
        customer = found;
      } else {
        customer = await this.customersService.findOrCreateByPhone(dto.customerPhone, dto.customerName);
      }
    } else {
      customer = await this.customersService.findOrCreateByPhone(dto.customerPhone, dto.customerName);
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await em.find(
      Product,
      { id: { $in: productIds } },
      { populate: ['extras', 'optionGroups', 'optionGroups.options'] },
    );

    let calculatedTotal = 0;

    // Atomic daily counter — single UPSERT, no race condition possible
    const result = await em.getConnection().execute(
      `INSERT INTO daily_order_counter (date, counter) VALUES (CURRENT_DATE, 1)
       ON CONFLICT (date) DO UPDATE SET counter = daily_order_counter.counter + 1
       RETURNING counter`,
    );
    const orderNumber = result[0]?.counter ?? 1;

    const order = em.create(Order, {
      orderNumber,
      customer,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      paymentMethod: dto.paymentMethod as PaymentMethod,
      deliveryType: dto.deliveryType || 'pickup',
      deliveryAddress: dto.deliveryAddress || undefined,
      notes: dto.notes,
      status: OrderStatus.PENDING_PAYMENT,
      totalAmount: '0',
    });

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      if (!product.isActive) {
        throw new BadRequestException(`Product ${product.name} is unavailable`);
      }

      let extrasCents = 0;
      const selectedExtras: Array<{ name: string; price: number }> = [];
      let groupedExtras: Array<{ groupName: string; groupId: string; options: Array<{ name: string; price: number }> }> | null = null;

      if (product.isCompound && item.optionSelections?.length) {
        // Compound product: validate option group selections
        groupedExtras = [];
        for (const selection of item.optionSelections) {
          const group = product.optionGroups.getItems().find((g) => g.id === selection.groupId);
          if (!group || !group.isActive) {
            throw new BadRequestException(`Grupo de opcoes ${selection.groupId} nao encontrado`);
          }
          if (selection.optionIds.length < (group.minSelections ?? 0)) {
            throw new BadRequestException(`Grupo "${group.name}" requer pelo menos ${group.minSelections} opcao(oes)`);
          }
          if (selection.optionIds.length > (group.maxSelections ?? 1)) {
            throw new BadRequestException(`Grupo "${group.name}" permite no maximo ${group.maxSelections} opcao(oes)`);
          }

          const groupOptions: Array<{ name: string; price: number }> = [];
          for (const optionId of selection.optionIds) {
            const option = group.options.getItems().find((o) => o.id === optionId);
            if (!option || !option.isActive) {
              throw new BadRequestException(`Opcao ${optionId} nao encontrada no grupo "${group.name}"`);
            }
            const optionPrice = Math.round(parseFloat(option.price) * 100);
            extrasCents += optionPrice;
            groupOptions.push({ name: option.name, price: optionPrice / 100 });
          }
          groupedExtras.push({ groupName: group.name, groupId: group.id, options: groupOptions });
        }

        // Validate all required groups have selections
        for (const group of product.optionGroups.getItems()) {
          if (group.isActive && (group.minSelections ?? 0) > 0) {
            const sel = item.optionSelections.find((s) => s.groupId === group.id);
            if (!sel || sel.optionIds.length < (group.minSelections ?? 0)) {
              throw new BadRequestException(`Grupo obrigatorio "${group.name}" requer pelo menos ${group.minSelections} opcao(oes)`);
            }
          }
        }
      } else if (item.extraIds?.length) {
        // Non-compound: flat extras (existing behavior)
        for (const extraId of item.extraIds) {
          const extra = product.extras.getItems().find((e) => e.id === extraId);
          if (!extra || !extra.isActive) {
            throw new BadRequestException(`Extra ${extraId} not found or unavailable`);
          }
          const extraPrice = Math.round(parseFloat(extra.price) * 100);
          extrasCents += extraPrice;
          selectedExtras.push({ name: extra.name, price: extraPrice / 100 });
        }
      }

      const unitPriceCents = Math.round(parseFloat(getEffectivePrice(product)) * 100) + extrasCents;
      const subtotalCents = unitPriceCents * item.quantity;
      calculatedTotal += subtotalCents;

      em.create(OrderItem, {
        order,
        productId: product.id,
        productName: product.name,
        unitPrice: (unitPriceCents / 100).toFixed(2),
        quantity: item.quantity,
        subtotal: (subtotalCents / 100).toFixed(2),
        extras: selectedExtras.length > 0 ? selectedExtras : null,
        groupedExtras: groupedExtras && groupedExtras.length > 0 ? groupedExtras : null,
      });
    }

    // Delivery fee lookup
    if (dto.deliveryType === 'delivery') {
      if (!dto.deliveryAreaId) {
        throw new BadRequestException('Área de entrega é obrigatória para delivery');
      }
      const deliveryArea = await em.findOne(DeliveryArea, { id: dto.deliveryAreaId, isActive: true });
      if (!deliveryArea) {
        throw new BadRequestException('Área de entrega não encontrada ou indisponível');
      }
      const deliveryFeeCents = Math.round(parseFloat(deliveryArea.fee) * 100);
      calculatedTotal += deliveryFeeCents;
      order.deliveryFee = deliveryArea.fee;
    }

    // Coupon discount
    let couponResult: Awaited<ReturnType<CouponsService['validateAndCalculate']>> | null = null;
    if (dto.couponCode) {
      couponResult = await this.couponsService.validateAndCalculate(
        dto.couponCode,
        dto.items,
        dto.deliveryType || 'pickup',
        dto.customerPhone,
      );

      if (!couponResult.valid) {
        throw new BadRequestException(couponResult.reason);
      }

      const discountCents = Math.round(couponResult.calculatedDiscount * 100);
      calculatedTotal -= discountCents;
      if (calculatedTotal < 0) calculatedTotal = 0;

      order.coupon = em.getReference(Coupon, couponResult.coupon.id);
      order.couponCode = couponResult.coupon.code;
      order.discountAmount = couponResult.calculatedDiscount.toFixed(2);
    }

    // Redeemed items (loyalty)
    let totalPointsSpent = 0;
    if (dto.redeemedItems?.length && customer) {
      const redeemProductIds = dto.redeemedItems.map((r) => r.productId);
      const redeemProducts = await em.find(Product, { id: { $in: redeemProductIds } });

      for (const ri of dto.redeemedItems) {
        const product = redeemProducts.find((p) => p.id === ri.productId);
        if (!product) {
          throw new BadRequestException(`Produto resgatavel ${ri.productId} nao encontrado`);
        }
        if (!product.isRedeemable || !product.isActive) {
          throw new BadRequestException(`Produto ${product.name} nao esta disponivel para resgate`);
        }
        totalPointsSpent += product.redemptionCost ?? 0;

        em.create(OrderItem, {
          order,
          productId: product.id,
          productName: product.name,
          unitPrice: '0.00',
          quantity: 1,
          subtotal: '0.00',
          extras: null,
          isRedeemed: true,
          pointsSpent: product.redemptionCost ?? 0,
        });
      }

      if (totalPointsSpent > 0) {
        // Verify and debit points atomically
        const result = await em.getConnection().execute(
          `UPDATE "customers" SET "loyalty_points" = "loyalty_points" - ? WHERE "id" = ? AND "loyalty_points" >= ? RETURNING "loyalty_points"`,
          [totalPointsSpent, customer.id, totalPointsSpent],
        );
        if (!result.length) {
          throw new BadRequestException('Pontos de fidelidade insuficientes');
        }
        customer.loyaltyPoints = result[0].loyalty_points;
        order.pointsSpent = totalPointsSpent;
      }
    }

    order.totalAmount = (calculatedTotal / 100).toFixed(2);
    await em.flush();

    // Post-flush: record loyalty redemption transaction
    if (totalPointsSpent > 0 && customer) {
      em.create(LoyaltyTransaction, {
        customer,
        order,
        points: -totalPointsSpent,
        type: 'redeem',
        description: `Resgate — Pedido #${order.orderNumber}`,
      });
      await em.flush();
    }

    // Post-flush: increment coupon usage atomically + record usage
    if (couponResult && couponResult.valid) {
      await em.getConnection().execute(
        `UPDATE "coupons" SET "current_uses" = "current_uses" + 1 WHERE "id" = ?`,
        [couponResult.coupon.id],
      );

      em.create(CouponUsage, {
        coupon: em.getReference(Coupon, couponResult.coupon.id),
        customer,
        order,
      });
      await em.flush();
    }

    this.logger.log(`Order #${orderNumber} created — ${order.customerName} — R$${order.totalAmount} — ${dto.paymentMethod}`);

    return {
      ...this.formatOrder(order),
      customerToken: customer.token,
    };
  }

  async findById(id: string) {
    const order = await this.em.findOne(Order, { id }, { populate: ['items', 'customer'] });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async getOrderResponse(id: string) {
    const order = await this.findById(id);
    return this.formatOrder(order);
  }

  async getKitchenOrders() {
    const orders = await this.em.find(
      Order,
      { status: { $in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY] } },
      { populate: ['items'], orderBy: { createdAt: 'ASC' } },
    );
    return orders.map((o) => this.formatOrder(o));
  }

  async updateStatus(id: string, newStatus: OrderStatus) {
    const order = await this.findById(id);
    const allowed = VALID_TRANSITIONS[order.status!] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}`,
      );
    }
    const oldStatus = order.status;
    order.status = newStatus;
    await this.em.flush();

    // Credit loyalty points on DELIVERED if customer has a password (registered)
    if (newStatus === OrderStatus.DELIVERED && order.customer?.passwordHash) {
      try {
        const settings = await this.em.findOne(StoreSettings, { id: 1 });
        const pointsPerReal = settings?.pointsPerReal ? parseFloat(settings.pointsPerReal) : 0;
        if (pointsPerReal > 0) {
          const totalCents = Math.round(parseFloat(order.totalAmount) * 100);
          const deliveryFeeCents = order.deliveryFee ? Math.round(parseFloat(order.deliveryFee) * 100) : 0;
          const eligibleCents = totalCents - deliveryFeeCents;
          const pointsEarned = Math.floor((eligibleCents / 100) * pointsPerReal);
          if (pointsEarned > 0) {
            await this.em.getConnection().execute(
              `UPDATE "customers" SET "loyalty_points" = "loyalty_points" + ? WHERE "id" = ?`,
              [pointsEarned, order.customer.id],
            );
            order.customer.loyaltyPoints += pointsEarned;
            order.pointsEarned = pointsEarned;
            this.em.create(LoyaltyTransaction, {
              customer: order.customer,
              order,
              points: pointsEarned,
              type: 'earn',
              description: `Pedido #${order.orderNumber}`,
            });
            await this.em.flush();
            this.logger.log(`Loyalty: +${pointsEarned} points for customer ${order.customer.phone} (order #${order.orderNumber})`);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to credit loyalty points for order #${order.orderNumber}`, err);
      }
    }

    this.kitchenGateway.emitOrderStatusChanged(order);
    this.logger.log(`Order #${order.orderNumber} status: ${oldStatus} → ${newStatus}`);
    return this.formatOrder(order);
  }

  private formatOrder(order: Order) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount),
      couponCode: order.couponCode ?? null,
      discountAmount: order.discountAmount ? parseFloat(order.discountAmount) : null,
      deliveryFee: order.deliveryFee ? parseFloat(order.deliveryFee) : null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryType: order.deliveryType || 'pickup',
      deliveryAddress: order.deliveryAddress,
      notes: order.notes,
      items: order.items.getItems().map((item) => ({
        id: item.id,
        productName: item.productName,
        unitPrice: parseFloat(item.unitPrice),
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
        extras: item.extras,
        groupedExtras: item.groupedExtras ?? null,
      })),
      createdAt: order.createdAt!.toISOString(),
      updatedAt: order.updatedAt!.toISOString(),
    };
  }
}
