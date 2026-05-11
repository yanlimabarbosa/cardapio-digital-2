import { Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import * as crypto from 'crypto';
import { Customer } from '../../../../entities';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  FindOrCreateOrderCustomerCommand,
  OrderCustomerModel,
  OrderCustomerRepository,
} from '../../application/ports/order-customer.port';

export class MikroOrmOrderCustomerRepository implements OrderCustomerRepository {
  private readonly logger = new Logger(MikroOrmOrderCustomerRepository.name);

  public constructor(private readonly em: EntityManager) {}

  public async findOrCreateForOrder(
    command: FindOrCreateOrderCustomerCommand,
  ): Promise<OrderCustomerModel> {
    const em = command.context ? getMikroOrmEntityManager(command.context) : this.em;

    if (command.customerToken) {
      const customerByToken = await em.findOne(Customer, {
        token: command.customerToken,
        isActive: true,
      });

      if (customerByToken) {
        return this.toModel(customerByToken);
      }
    }

    const normalizedPhone = this.normalizePhone(command.phone);
    let customer = await em.findOne(Customer, { phone: normalizedPhone });

    if (!customer) {
      customer = em.create(Customer, {
        phone: normalizedPhone,
        name: command.name,
        token: crypto.randomUUID(),
        loyaltyPoints: 0,
        isActive: true,
      });
      await em.flush();
      this.logger.log(`Customer auto-created via order: ${normalizedPhone} — ${command.name}`);
    }

    return this.toModel(customer);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private toModel(customer: Customer): OrderCustomerModel {
    return {
      id: customer.id,
      token: customer.token,
      loyaltyPoints: customer.loyaltyPoints,
    };
  }
}
