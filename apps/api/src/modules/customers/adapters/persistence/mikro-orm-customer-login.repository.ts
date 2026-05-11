import { Logger } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AdminUser, Customer } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  CustomerLoginCredentials,
  CustomerLoginModel,
  CustomerLoginRepository,
  CustomerLoginRepositoryResult,
} from '../../application/ports/customer-login.repository.port';

export type CustomerPasswordCompare = (password: string, passwordHash: string) => Promise<boolean>;
export type CustomerLoginTokenFactory = () => string;

export class MikroOrmCustomerLoginRepository implements CustomerLoginRepository {
  private readonly logger: Logger = new Logger(MikroOrmCustomerLoginRepository.name);

  public constructor(
    private readonly comparePassword: CustomerPasswordCompare = (password, passwordHash) =>
      bcrypt.compare(password, passwordHash),
    private readonly createToken: CustomerLoginTokenFactory = () => crypto.randomUUID(),
  ) {}

  public async login(
    credentials: CustomerLoginCredentials,
    context: TransactionContext,
  ): Promise<CustomerLoginRepositoryResult> {
    const em = getMikroOrmEntityManager(context);
    const normalizedPhone = credentials.phone.value;
    const customer = await em.findOne(Customer, { phone: normalizedPhone });

    if (!customer || !customer.passwordHash) {
      return { status: 'invalid-credentials' };
    }

    const validPassword = await this.comparePassword(credentials.password, customer.passwordHash);
    if (!validPassword) {
      return { status: 'invalid-password' };
    }

    customer.token = this.createToken();
    await em.flush();

    this.logger.log(`Customer logged in: ${normalizedPhone}`);

    const isAdmin = await this.checkIsAdmin(em, normalizedPhone);

    return {
      status: 'authenticated',
      token: customer.token,
      customer: this.toLoginModel(customer, isAdmin),
    };
  }

  private async checkIsAdmin(em: EntityManager, phone: string): Promise<boolean> {
    const admin = await em.findOne(AdminUser, { phone });

    return Boolean(admin);
  }

  private toLoginModel(customer: Customer, isAdmin: boolean): CustomerLoginModel {
    return {
      name: customer.name,
      phone: customer.phone,
      hasPassword: Boolean(customer.passwordHash),
      loyaltyPoints: customer.loyaltyPoints,
      isAdmin,
    };
  }
}
