import { LoyaltyPointsPolicy } from '../../../../shared/domain/loyalty-points.policy';
import { CustomerNotFoundError } from '../errors/customer.errors';
import type {
  CustomerRedeemableProductRecord,
  CustomerRedeemableProductsReadRepository,
} from '../ports/customer-redeemable-products.read-repository.port';
import type {
  CustomerRedeemableProductReadModel,
  CustomerRedeemableProductsReadModel,
} from '../read-models/customer-redeemable-products.read-model';

export class GetCustomerRedeemableProductsUseCase {
  public constructor(private readonly products: CustomerRedeemableProductsReadRepository) {}

  public async execute(customerId: string): Promise<CustomerRedeemableProductsReadModel> {
    const result = await this.products.getByCustomerId(customerId);

    if (!result) {
      throw new CustomerNotFoundError();
    }

    const loyaltyPolicy = LoyaltyPointsPolicy.forBalance(result.balance);

    return {
      balance: result.balance,
      products: result.products.map((product) => this.toReadModel(product, loyaltyPolicy)),
    };
  }

  private toReadModel(
    product: CustomerRedeemableProductRecord,
    loyaltyPolicy: LoyaltyPointsPolicy,
  ): CustomerRedeemableProductReadModel {
    return {
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      price: Number.parseFloat(product.price),
      redemptionCost: loyaltyPolicy.redemptionCost(product.redemptionCost),
      canRedeem: loyaltyPolicy.canRedeem(product.redemptionCost),
    };
  }
}
