import type { DeliveryAreaReadRepository } from '../ports/delivery-area.read-repository.port';
import type { DeliveryAreaReadModel } from '../read-models/delivery-area.read-model';

export class ListAdminDeliveryAreasUseCase {
  public constructor(private readonly deliveryAreas: DeliveryAreaReadRepository) {}

  public execute(): Promise<readonly DeliveryAreaReadModel[]> {
    return this.deliveryAreas.listAll();
  }
}
