import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Customer } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  CustomerPasswordModel,
  CustomerPasswordRepository,
  CustomerSetPasswordData,
  CustomerSetPasswordRepositoryResult,
} from '../../application/ports/customer-password.repository.port';

export type CustomerSetPasswordHashFactory = (password: string) => Promise<string>;

export class MikroOrmCustomerPasswordRepository implements CustomerPasswordRepository {
  private readonly logger: Logger = new Logger(MikroOrmCustomerPasswordRepository.name);

  public constructor(
    private readonly hashPassword: CustomerSetPasswordHashFactory = (password) => bcrypt.hash(password, 10),
  ) {}

  public async setPassword(
    data: CustomerSetPasswordData,
    context: TransactionContext,
  ): Promise<CustomerSetPasswordRepositoryResult> {
    const em = getMikroOrmEntityManager(context);
    const customer = await em.findOne(Customer, { id: data.customerId });

    if (!customer) {
      return { status: 'not-found' };
    }

    if (customer.passwordHash) {
      return { status: 'already-set' };
    }

    customer.passwordHash = await this.hashPassword(data.password);
    await em.flush();

    this.logger.log(`Customer set password: ${customer.phone}`);

    return {
      status: 'updated',
      customer: this.toPasswordModel(customer),
    };
  }

  private toPasswordModel(customer: Customer): CustomerPasswordModel {
    return {
      name: customer.name,
      phone: customer.phone,
      hasPassword: Boolean(customer.passwordHash),
      loyaltyPoints: customer.loyaltyPoints,
      isAdmin: false,
    };
  }
}
