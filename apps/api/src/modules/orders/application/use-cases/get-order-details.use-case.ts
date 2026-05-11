import type { OrderReadRepository } from '../ports/order-read-repository.port';
import type { OrderReadModel } from '../read-models/order.read-model';

export type GetOrderDetailsCommand = {
  readonly id: string;
};

export type GetOrderDetailsResult = OrderReadModel;

export class GetOrderDetailsUseCase {
  public constructor(private readonly orderReadRepository: OrderReadRepository) {}

  public execute(command: GetOrderDetailsCommand): Promise<GetOrderDetailsResult> {
    return this.orderReadRepository.getOrderDetails(command.id);
  }
}
