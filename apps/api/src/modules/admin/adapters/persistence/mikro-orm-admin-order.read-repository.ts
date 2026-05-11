import type { FilterQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import type { OrderStatus } from '@cardapio/shared';
import { Order, OrderItem } from '../../../../entities';
import type {
  AdminOrderReadRepository,
  ListAdminOrderHistoryReadQuery,
  ListAdminOrdersReadQuery,
} from '../../application/ports/admin-order.read-repository.port';
import type {
  AdminOrderDeliveryAddressReadModel,
  AdminOrderHistoryOrderReadModel,
  AdminOrderHistoryPageReadModel,
} from '../../application/read-models/admin-order-history.read-model';
import type {
  AdminOrderItemExtraReadModel,
  AdminOrderItemGroupedExtraReadModel,
  AdminOrderItemReadModel,
  AdminOrderReadModel,
} from '../../application/read-models/admin-order.read-model';

export class MikroOrmAdminOrderReadRepository implements AdminOrderReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async list(query: ListAdminOrdersReadQuery): Promise<readonly AdminOrderReadModel[]> {
    const orders = await this.em.find(Order, this.toWhere(query), {
      populate: ['items'],
      orderBy: { createdAt: 'DESC' },
      limit: query.limit,
    });

    return orders.map((order: Order): AdminOrderReadModel => this.toReadModel(order));
  }

  public async listHistory(
    query: ListAdminOrderHistoryReadQuery,
  ): Promise<AdminOrderHistoryPageReadModel> {
    const [orders, total] = await this.em.findAndCount(Order, this.toHistoryWhere(query), {
      populate: ['items'],
      orderBy: { createdAt: 'DESC' },
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    return {
      data: orders.map((order: Order): AdminOrderHistoryOrderReadModel =>
        this.toHistoryReadModel(order),
      ),
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private toWhere(query: ListAdminOrdersReadQuery): FilterQuery<Order> {
    if (query.mode === 'status') {
      return { status: query.status as OrderStatus };
    }

    return [
      { status: { $in: query.activeStatuses } },
      { createdAt: { $gte: query.createdAtFrom } },
    ];
  }

  private toHistoryWhere(query: ListAdminOrderHistoryReadQuery): FilterQuery<Order> {
    const where: FilterQuery<Order> = {};
    const createdAt: { $gte?: Date; $lte?: Date } = {};

    if (query.status) {
      where.status = query.status as OrderStatus;
    }

    if (query.from) {
      createdAt.$gte = new Date(query.from);
    }

    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      createdAt.$lte = toDate;
    }

    if (createdAt.$gte || createdAt.$lte) {
      where.createdAt = createdAt;
    }

    if (query.search) {
      const q = query.search.trim();
      const asNumber = Number.parseInt(q, 10);

      if (!Number.isNaN(asNumber) && q === String(asNumber)) {
        where.orderNumber = asNumber;
      } else {
        where.customerName = { $ilike: `%${q}%` };
      }
    }

    return where;
  }

  private toHistoryReadModel(order: Order): AdminOrderHistoryOrderReadModel {
    return {
      ...this.toReadModel(order),
      deliveryAddress: this.toDeliveryAddress(order.deliveryAddress),
    };
  }

  private toReadModel(order: Order): AdminOrderReadModel {
    const items = order.items.getItems();

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      status: order.status,
      totalAmount: Number.parseFloat(order.totalAmount),
      deliveryFee: order.deliveryFee ? Number.parseFloat(order.deliveryFee) : null,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      deliveryType: order.deliveryType || 'pickup',
      scheduledFor: order.scheduledFor?.toISOString() ?? null,
      itemCount: items.length,
      items: items.map((item: OrderItem): AdminOrderItemReadModel => this.toItemReadModel(item)),
      createdAt: order.createdAt,
    };
  }

  private toItemReadModel(item: OrderItem): AdminOrderItemReadModel {
    return {
      id: item.id,
      productName: item.productName,
      unitPrice: Number.parseFloat(item.unitPrice),
      quantity: item.quantity,
      subtotal: Number.parseFloat(item.subtotal),
      extras: this.toExtras(item.extras),
      groupedExtras: this.toGroupedExtras(item.groupedExtras),
    };
  }

  private toExtras(
    extras: Array<{ name: string; price: number }> | undefined,
  ): readonly AdminOrderItemExtraReadModel[] | undefined {
    return extras?.map((extra): AdminOrderItemExtraReadModel => ({
      name: extra.name,
      price: extra.price,
    }));
  }

  private toGroupedExtras(
    groupedExtras:
      | Array<{
          groupId: string;
          groupName: string;
          options: Array<{ name: string; price: number }>;
        }>
      | undefined,
  ): readonly AdminOrderItemGroupedExtraReadModel[] | null {
    if (!groupedExtras) {
      return null;
    }

    return groupedExtras.map((group): AdminOrderItemGroupedExtraReadModel => ({
      groupId: group.groupId,
      groupName: group.groupName,
      options: group.options.map((option): AdminOrderItemExtraReadModel => ({
        name: option.name,
        price: option.price,
      })),
    }));
  }

  private toDeliveryAddress(
    address: Order['deliveryAddress'],
  ): AdminOrderDeliveryAddressReadModel | undefined {
    if (!address) {
      return undefined;
    }

    return {
      cep: address.cep,
      city: address.city,
      complement: address.complement,
      neighborhood: address.neighborhood,
      number: address.number,
      state: address.state,
      street: address.street,
    };
  }
}
