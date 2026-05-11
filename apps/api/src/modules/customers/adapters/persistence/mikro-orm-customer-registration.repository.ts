import { Logger } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AdminUser, Customer } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  CustomerRegistrationData,
  CustomerRegistrationModel,
  CustomerRegistrationRepository,
  CustomerRegistrationRepositoryResult,
} from '../../application/ports/customer-registration.repository.port';

export type CustomerPasswordHashFactory = (password: string) => Promise<string>;
export type RegistrationTokenFactory = () => string;

export class MikroOrmCustomerRegistrationRepository implements CustomerRegistrationRepository {
  private readonly logger: Logger = new Logger(MikroOrmCustomerRegistrationRepository.name);

  public constructor(
    private readonly hashPassword: CustomerPasswordHashFactory = (password) => bcrypt.hash(password, 10),
    private readonly createToken: RegistrationTokenFactory = () => crypto.randomUUID(),
  ) {}

  public async register(
    data: CustomerRegistrationData,
    context: TransactionContext,
  ): Promise<CustomerRegistrationRepositoryResult> {
    const em = getMikroOrmEntityManager(context);
    const normalizedPhone = data.phone.value;
    const existing = await em.findOne(Customer, { phone: normalizedPhone });

    if (existing) {
      return { status: 'duplicate-phone' };
    }

    const customer = em.create(Customer, {
      phone: normalizedPhone,
      name: data.name,
      passwordHash: await this.hashPassword(data.password),
      token: this.createToken(),
      loyaltyPoints: 0,
      isActive: true,
    });
    await em.flush();

    this.logger.log(`Customer registered: ${normalizedPhone} — ${data.name}`);

    const isAdmin = await this.checkIsAdmin(em, normalizedPhone);

    return {
      status: 'registered',
      token: customer.token,
      customer: this.toRegistrationModel(customer, isAdmin),
    };
  }

  private async checkIsAdmin(em: EntityManager, phone: string): Promise<boolean> {
    const admin = await em.findOne(AdminUser, { phone });

    return Boolean(admin);
  }

  private toRegistrationModel(customer: Customer, isAdmin: boolean): CustomerRegistrationModel {
    return {
      name: customer.name,
      phone: customer.phone,
      hasPassword: Boolean(customer.passwordHash),
      loyaltyPoints: customer.loyaltyPoints,
      isAdmin,
    };
  }
}
