import { CustomerNotFoundError } from '../errors/customer.errors';
import type {
  CustomerOrderHistoryReadRepository,
  GetCustomerOrderHistoryReadQuery,
} from '../ports/customer-order-history.read-repository.port';
import type { CustomerOrderHistoryPageReadModel } from '../read-models/customer-order-history.read-model';

export type GetCustomerOrderHistoryCommand = {
  readonly customerId: string;
  readonly limit: number;
  readonly page: number;
};

export class GetCustomerOrderHistoryUseCase {
  public constructor(private readonly orders: CustomerOrderHistoryReadRepository) {}

  public async execute(command: GetCustomerOrderHistoryCommand): Promise<CustomerOrderHistoryPageReadModel> {
    const result = await this.orders.getByCustomerId(this.toReadQuery(command));

    if (!result) {
      throw new CustomerNotFoundError();
    }

    return result;
  }

  private toReadQuery(command: GetCustomerOrderHistoryCommand): GetCustomerOrderHistoryReadQuery {
    return {
      customerId: command.customerId,
      limit: command.limit,
      page: command.page,
    };
  }
}
