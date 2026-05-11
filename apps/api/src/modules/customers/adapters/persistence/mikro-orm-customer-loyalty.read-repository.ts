import { EntityManager } from '@mikro-orm/postgresql';
import { Customer, LoyaltyTransaction } from '../../../../entities';
import type {
  CustomerLoyaltyReadRepository,
  GetCustomerLoyaltyReadQuery,
} from '../../application/ports/customer-loyalty.read-repository.port';
import type {
  CustomerLoyaltyReadModel,
  CustomerLoyaltyTransactionReadModel,
} from '../../application/read-models/customer-loyalty.read-model';

export class MikroOrmCustomerLoyaltyReadRepository implements CustomerLoyaltyReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async getByCustomerId(query: GetCustomerLoyaltyReadQuery): Promise<CustomerLoyaltyReadModel | null> {
    const customer = await this.em.findOne(Customer, { id: query.customerId, isActive: true });

    if (!customer) {
      return null;
    }

    const [transactions, total] = await this.em.findAndCount(
      LoyaltyTransaction,
      { customer },
      {
        orderBy: { createdAt: 'DESC' },
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      },
    );

    return {
      balance: customer.loyaltyPoints,
      transactions: transactions.map((transaction) => this.toTransactionReadModel(transaction)),
      total,
      page: query.page,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private toTransactionReadModel(
    transaction: LoyaltyTransaction,
  ): CustomerLoyaltyTransactionReadModel {
    return {
      id: transaction.id,
      points: transaction.points,
      type: transaction.type,
      description: transaction.description ?? null,
      createdAt: this.requireDate(transaction.createdAt, 'loyaltyTransaction.createdAt').toISOString(),
    };
  }

  private requireDate(value: Date | undefined, field: string): Date {
    if (!value) {
      throw new Error(`${field} is required`);
    }

    return value;
  }
}
