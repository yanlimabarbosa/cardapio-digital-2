import type { FilterQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Customer, Order } from '../../../../entities';
import type { AdminCustomerReadRepository } from '../../application/ports/admin-customer.read-repository.port';
import type { AdminCustomerReadModel } from '../../application/read-models/admin-customer.read-model';

export class MikroOrmAdminCustomerReadRepository implements AdminCustomerReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async list(search?: string): Promise<readonly AdminCustomerReadModel[]> {
    const where: FilterQuery<Customer> = {};

    if (search) {
      where.$or = [
        { name: { $like: `%${search}%` } },
        { phone: { $like: `%${search}%` } },
      ];
    }

    const customers = await this.em.find(Customer, where, { orderBy: { createdAt: 'DESC' } });
    const result: AdminCustomerReadModel[] = [];

    for (const customer of customers) {
      const orderCount = await this.em.count(Order, { customer });

      result.push({
        name: customer.name,
        phone: customer.phone,
        hasPassword: Boolean(customer.passwordHash),
        loyaltyPoints: customer.loyaltyPoints,
        isAdmin: false,
        totalOrders: orderCount,
        memberSince: this.requireDate(customer.createdAt, 'customer.createdAt').toISOString(),
      });
    }

    return result;
  }

  private requireDate(value: Date | undefined, field: string): Date {
    if (!value) {
      throw new Error(`${field} is required`);
    }

    return value;
  }
}
