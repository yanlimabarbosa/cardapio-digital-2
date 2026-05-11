import type { OrderReadRepository } from '../ports/order-read-repository.port';
import type { OrderReadModel } from '../read-models/order.read-model';

export type GetKitchenOrdersResult = readonly OrderReadModel[];

export class GetKitchenOrdersUseCase {
  public constructor(private readonly orderReadRepository: OrderReadRepository) {}

  public execute(): Promise<GetKitchenOrdersResult> {
    return this.orderReadRepository.getKitchenOrders();
  }
}
