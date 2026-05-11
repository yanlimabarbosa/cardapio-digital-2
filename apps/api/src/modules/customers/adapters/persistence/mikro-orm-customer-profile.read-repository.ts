import { EntityManager } from '@mikro-orm/postgresql';
import { AdminUser, Customer, Order } from '../../../../entities';
import type { CustomerProfileReadRepository } from '../../application/ports/customer-profile.read-repository.port';
import type { CustomerProfileReadModel } from '../../application/read-models/customer-profile.read-model';

export class MikroOrmCustomerProfileReadRepository implements CustomerProfileReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async getByCustomerId(customerId: string): Promise<CustomerProfileReadModel | null> {
    const customer = await this.em.findOne(Customer, { id: customerId, isActive: true });

    if (!customer) {
      return null;
    }

    const totalOrders = await this.em.count(Order, { customer });
    const isAdmin = await this.checkIsAdmin(customer.phone, Boolean(customer.passwordHash));

    return {
      name: customer.name,
      phone: customer.phone,
      hasPassword: Boolean(customer.passwordHash),
      loyaltyPoints: customer.loyaltyPoints,
      isAdmin,
      totalOrders,
      memberSince: this.requireDate(customer.createdAt, 'customer.createdAt').toISOString(),
    };
  }

  private async checkIsAdmin(phone: string, hasPassword: boolean): Promise<boolean> {
    if (!hasPassword) {
      return false;
    }

    const admin = await this.em.findOne(AdminUser, { phone });

    return Boolean(admin);
  }

  private requireDate(value: Date | undefined, field: string): Date {
    if (!value) {
      throw new Error(`${field} is required`);
    }

    return value;
  }
}
