import { EntityManager } from '@mikro-orm/postgresql';
import { Customer } from '../../../../entities';
import type { CustomerTokenAuthRepository } from '../../application/ports/customer-token-auth.repository.port';
import type { AuthenticatedCustomerReadModel } from '../../application/read-models/authenticated-customer.read-model';

export class MikroOrmCustomerTokenAuthRepository implements CustomerTokenAuthRepository {
  public constructor(private readonly em: EntityManager) {}

  public async findByToken(token: string): Promise<AuthenticatedCustomerReadModel | null> {
    const customer = await this.em.findOne(Customer, { token, isActive: true });

    if (!customer) {
      return null;
    }

    return { id: customer.id };
  }
}
