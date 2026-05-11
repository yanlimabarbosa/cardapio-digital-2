import { LockMode } from '@mikro-orm/core';
import { Logger } from '@nestjs/common';
import { Customer, LoyaltyTransaction, Order, StoreSettings } from '../../../../entities';
import type {
  CreditDeliveredOrderLoyaltyCommand,
  CreditDeliveredOrderLoyaltyResult,
  FindOrderForStatusChangeQuery,
  GetLoyaltyPointsPerRealQuery,
  GetOrderStatusChangeResultQuery,
  OrderStatusChangePersistenceResult,
  OrderStatusChangeTarget,
  OrderStatusRepository,
  SaveOrderStatusChangeCommand,
} from '../../application/ports/order-status-repository.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import { toOrderReadModel } from './order-read-model.mapper';

export class MikroOrmOrderStatusRepository implements OrderStatusRepository {
  private readonly logger = new Logger(MikroOrmOrderStatusRepository.name);

  public async findForStatusChange(
    query: FindOrderForStatusChangeQuery,
  ): Promise<OrderStatusChangeTarget | null> {
    const em = getMikroOrmEntityManager(query.context);
    const order = await em.findOne(
      Order,
      { id: query.id },
      { populate: ['customer'], lockMode: LockMode.PESSIMISTIC_WRITE },
    );

    if (!order) {
      return null;
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalCents: this.decimalToCents(order.totalAmount),
      deliveryFeeCents: order.deliveryFee ? this.decimalToCents(order.deliveryFee) : 0,
      customer: order.customer
        ? {
          id: order.customer.id,
          phone: order.customer.phone,
          loyaltyPoints: order.customer.loyaltyPoints,
          isRegistered: Boolean(order.customer.passwordHash),
        }
        : null,
    };
  }

  public async saveStatus(command: SaveOrderStatusChangeCommand): Promise<void> {
    const em = getMikroOrmEntityManager(command.context);
    const order = await em.findOne(Order, { id: command.id });

    if (!order) {
      throw new Error(`Order ${command.id} not found during status save`);
    }

    const oldStatus = order.status;
    order.status = command.status;
    await em.flush();
    this.logger.log(`Order #${order.orderNumber} status: ${oldStatus} -> ${command.status}`);
  }

  public async getStatusChangeResult(
    query: GetOrderStatusChangeResultQuery,
  ): Promise<OrderStatusChangePersistenceResult> {
    const em = getMikroOrmEntityManager(query.context);
    const order = await em.findOne(Order, { id: query.id }, { populate: ['items', 'customer'] });

    if (!order) {
      throw new Error(`Order ${query.id} not found after status change`);
    }

    const status = order.status;
    if (!status) {
      throw new Error(`Order ${query.id} status is required after status change`);
    }

    const orderReadModel = toOrderReadModel(order);

    return {
      order: orderReadModel,
      notification: {
        id: orderReadModel.id,
        status,
        updatedAt: orderReadModel.updatedAt,
      },
    };
  }

  public async getLoyaltyPointsPerReal(query: GetLoyaltyPointsPerRealQuery): Promise<number> {
    const em = getMikroOrmEntityManager(query.context);
    const settings = await em.findOne(StoreSettings, { id: 1 });

    return settings?.pointsPerReal ? parseFloat(settings.pointsPerReal) : 0;
  }

  public async creditDeliveredOrderLoyalty(
    command: CreditDeliveredOrderLoyaltyCommand,
  ): Promise<CreditDeliveredOrderLoyaltyResult> {
    const em = getMikroOrmEntityManager(command.context);

    try {
      const order = await em.findOne(Order, { id: command.orderId }, { populate: ['customer'] });

      if (!order) {
        throw new Error(`Order ${command.orderId} not found during loyalty credit`);
      }

      await em.getConnection().execute(
        `UPDATE "customers" SET "loyalty_points" = "loyalty_points" + ? WHERE "id" = ?`,
        [command.pointsEarned, command.customerId],
      );

      if (order.customer.id === command.customerId) {
        order.customer.loyaltyPoints += command.pointsEarned;
      }

      order.pointsEarned = command.pointsEarned;
      em.create(LoyaltyTransaction, {
        customer: em.getReference(Customer, command.customerId),
        order,
        points: command.pointsEarned,
        type: 'earn',
        description: `Pedido #${command.orderNumber}`,
      });
      await em.flush();
      this.logger.log(
        `Loyalty: +${command.pointsEarned} points for customer ${command.customerPhone} (order #${command.orderNumber})`,
      );

      return { credited: true, pointsEarned: command.pointsEarned };
    } catch (error: unknown) {
      this.logger.error(`Failed to credit loyalty points for order #${command.orderNumber}`, error);
      return { credited: false, pointsEarned: 0 };
    }
  }

  private decimalToCents(value: string): number {
    return Math.round(parseFloat(value) * 100);
  }
}
