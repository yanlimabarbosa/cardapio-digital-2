import { NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { OrderStatus } from '@cardapio/shared';
import { Order } from '../../../../entities';
import type { OrderReadRepository } from '../../application/ports/order-read-repository.port';
import type { OrderReadModel } from '../../application/read-models/order.read-model';
import { toOrderReadModel } from './order-read-model.mapper';

export class MikroOrmOrderReadRepository implements OrderReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async getKitchenOrders(): Promise<readonly OrderReadModel[]> {
    const orders = await this.em.find(
      Order,
      { status: { $in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.OUT_FOR_DELIVERY] } },
      { populate: ['items'], orderBy: { createdAt: 'ASC' } },
    );

    return orders.map((order) => this.toOrderReadModel(order));
  }

  public async getOrderDetails(id: string): Promise<OrderReadModel> {
    const order = await this.em.findOne(Order, { id }, { populate: ['items', 'customer'] });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return this.toOrderReadModel(order);
  }

  private toOrderReadModel(order: Order): OrderReadModel {
    return toOrderReadModel(order);
  }
}
