import { EntityManager } from '@mikro-orm/postgresql';
import { Customer, Order, OrderItem } from '../../../../entities';
import type {
  CustomerOrderHistoryReadRepository,
  GetCustomerOrderHistoryReadQuery,
} from '../../application/ports/customer-order-history.read-repository.port';
import type {
  CustomerOrderHistoryOrderReadModel,
  CustomerOrderHistoryPageReadModel,
  CustomerOrderItemExtraReadModel,
  CustomerOrderItemReadModel,
} from '../../application/read-models/customer-order-history.read-model';

type OrderItemExtra = {
  readonly name: string;
  readonly price: number;
};

export class MikroOrmCustomerOrderHistoryReadRepository
  implements CustomerOrderHistoryReadRepository
{
  public constructor(private readonly em: EntityManager) {}

  public async getByCustomerId(
    query: GetCustomerOrderHistoryReadQuery,
  ): Promise<CustomerOrderHistoryPageReadModel | null> {
    const customer = await this.em.findOne(Customer, { id: query.customerId, isActive: true });

    if (!customer) {
      return null;
    }

    const [orders, total] = await this.em.findAndCount(
      Order,
      { customer },
      {
        populate: ['items'],
        orderBy: { createdAt: 'DESC' },
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      },
    );

    return {
      orders: orders.map((order) => this.toOrderReadModel(order)),
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private toOrderReadModel(order: Order): CustomerOrderHistoryOrderReadModel {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      totalAmount: Number.parseFloat(order.totalAmount),
      deliveryFee: order.deliveryFee ? Number.parseFloat(order.deliveryFee) : null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryType: order.deliveryType || 'pickup',
      scheduledFor: order.scheduledFor?.toISOString() ?? null,
      items: order.items.getItems().map((item) => this.toItemReadModel(item)),
      createdAt: this.requireDate(order.createdAt, 'order.createdAt').toISOString(),
    };
  }

  private toItemReadModel(item: OrderItem): CustomerOrderItemReadModel {
    return {
      id: item.id,
      productName: item.productName,
      unitPrice: Number.parseFloat(item.unitPrice),
      quantity: item.quantity,
      subtotal: Number.parseFloat(item.subtotal),
      extras: this.toExtras(item.extras),
    };
  }

  private toExtras(
    extras: readonly OrderItemExtra[] | null | undefined,
  ): readonly CustomerOrderItemExtraReadModel[] | null | undefined {
    if (extras === null) {
      return null;
    }

    return extras?.map((extra): CustomerOrderItemExtraReadModel => ({
      name: extra.name,
      price: extra.price,
    }));
  }

  private requireDate(value: Date | undefined, field: string): Date {
    if (!value) {
      throw new Error(`${field} is required`);
    }

    return value;
  }
}
