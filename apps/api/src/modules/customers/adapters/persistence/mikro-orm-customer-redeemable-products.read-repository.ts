import { EntityManager } from '@mikro-orm/postgresql';
import { Customer, Product } from '../../../../entities';
import type {
  CustomerRedeemableProductRecord,
  CustomerRedeemableProductsReadRepository,
  CustomerRedeemableProductsRecord,
} from '../../application/ports/customer-redeemable-products.read-repository.port';

export class MikroOrmCustomerRedeemableProductsReadRepository
  implements CustomerRedeemableProductsReadRepository
{
  public constructor(private readonly em: EntityManager) {}

  public async getByCustomerId(customerId: string): Promise<CustomerRedeemableProductsRecord | null> {
    const customer = await this.em.findOne(Customer, { id: customerId, isActive: true });

    if (!customer) {
      return null;
    }

    const products = await this.em.find(
      Product,
      { isRedeemable: true, isActive: true },
      { orderBy: { name: 'ASC' } },
    );

    return {
      balance: customer.loyaltyPoints,
      products: products.map((product) => this.toRecord(product)),
    };
  }

  private toRecord(product: Product): CustomerRedeemableProductRecord {
    return {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl ?? null,
      price: product.price,
      redemptionCost: product.redemptionCost ?? null,
    };
  }
}
