import { EntityManager } from '@mikro-orm/postgresql';
import { Coupon, Customer, Order, OrderItem } from '../../../../entities';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  CreateOrderItemGroupedExtraInput,
  CreateOrderPersistenceCommand,
  CreateOrderPersistenceResult,
  OrderCreationRepository,
} from '../../application/ports/order-creation.repository.port';
import { toOrderReadModel } from './order-read-model.mapper';

export class MikroOrmOrderCreationRepository implements OrderCreationRepository {
  public constructor(private readonly em: EntityManager) {}

  public async create(command: CreateOrderPersistenceCommand): Promise<CreateOrderPersistenceResult> {
    const em = command.context ? getMikroOrmEntityManager(command.context) : this.em.fork();
    const order = em.create(Order, {
      orderNumber: command.orderNumber,
      customer: em.getReference(Customer, command.customerId),
      customerName: command.customerName,
      customerPhone: command.customerPhone,
      customerEmail: command.customerEmail,
      paymentMethod: command.paymentMethod,
      deliveryType: command.deliveryType,
      deliveryAddress: command.deliveryAddress,
      notes: command.notes,
      scheduledFor: command.scheduledFor,
      status: command.status,
      totalAmount: command.totalAmount,
      deliveryFee: command.deliveryFee,
      coupon: command.couponId ? em.getReference(Coupon, command.couponId) : undefined,
      couponCode: command.couponCode,
      discountAmount: command.discountAmount,
      pointsSpent: command.pointsSpent,
    });

    for (const item of command.items) {
      em.create(OrderItem, {
        order,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        extras: item.extras.length > 0 ? [...item.extras] : null,
        groupedExtras: item.groupedExtras.length > 0 ? this.toGroupedExtras(item.groupedExtras) : null,
        isRedeemed: item.isRedeemed,
        pointsSpent: item.pointsSpent,
      });
    }

    await em.flush();

    return {
      order: toOrderReadModel(order),
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  private toGroupedExtras(
    groups: readonly CreateOrderItemGroupedExtraInput[],
  ): Array<{
    groupId: string;
    groupName: string;
    options: Array<{ name: string; price: number }>;
  }> {
    return groups.map((group) => ({
      groupId: group.groupId,
      groupName: group.groupName,
      options: group.options.map((option) => ({ name: option.name, price: option.price })),
    }));
  }
}
