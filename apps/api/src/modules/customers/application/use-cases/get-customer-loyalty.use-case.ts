import { CustomerNotFoundError } from '../errors/customer.errors';
import type {
  CustomerLoyaltyReadRepository,
  GetCustomerLoyaltyReadQuery,
} from '../ports/customer-loyalty.read-repository.port';
import type { CustomerLoyaltyReadModel } from '../read-models/customer-loyalty.read-model';

export type GetCustomerLoyaltyCommand = {
  readonly customerId: string;
  readonly limit: number;
  readonly page: number;
};

export class GetCustomerLoyaltyUseCase {
  public constructor(private readonly loyalty: CustomerLoyaltyReadRepository) {}

  public async execute(command: GetCustomerLoyaltyCommand): Promise<CustomerLoyaltyReadModel> {
    const result = await this.loyalty.getByCustomerId(this.toReadQuery(command));

    if (!result) {
      throw new CustomerNotFoundError();
    }

    return result;
  }

  private toReadQuery(command: GetCustomerLoyaltyCommand): GetCustomerLoyaltyReadQuery {
    return {
      customerId: command.customerId,
      limit: command.limit,
      page: command.page,
    };
  }
}
