import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Customer } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type { CustomerPhone } from '../../domain/customer-phone.value-object';
import type {
  CustomerIdentityModel,
  CustomerIdentityRepository,
  CustomerIdentifyRepositoryResult,
} from '../../application/ports/customer-identity.repository.port';

export type CustomerTokenFactory = () => string;

export class MikroOrmCustomerIdentityRepository implements CustomerIdentityRepository {
  private readonly logger = new Logger(MikroOrmCustomerIdentityRepository.name);

  public constructor(private readonly createToken: CustomerTokenFactory = () => crypto.randomUUID()) {}

  public async identifyByPhone(
    phone: CustomerPhone,
    context: TransactionContext,
  ): Promise<CustomerIdentifyRepositoryResult> {
    const em = getMikroOrmEntityManager(context);
    const normalizedPhone = phone.value;
    const customer = await em.findOne(Customer, { phone: normalizedPhone });

    if (!customer) {
      return { status: 'missing' };
    }

    if (customer.passwordHash) {
      return { status: 'password-required' };
    }

    customer.token = this.createToken();
    await em.flush();

    this.logger.log(`Customer identified (no password): ${normalizedPhone}`);

    return {
      status: 'authenticated',
      token: customer.token,
      customer: this.toIdentityModel(customer),
    };
  }

  private toIdentityModel(customer: Customer): CustomerIdentityModel {
    return {
      name: customer.name,
      phone: customer.phone,
      hasPassword: Boolean(customer.passwordHash),
      loyaltyPoints: customer.loyaltyPoints,
      isAdmin: false,
    };
  }
}
