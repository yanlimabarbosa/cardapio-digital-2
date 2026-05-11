import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { DeliveryAreaNotFoundError } from '../errors/delivery-area.errors';
import type { DeliveryAreaWriteRepository } from '../ports/delivery-area-write.repository.port';

export class DeleteDeliveryAreaUseCase {
  public constructor(
    private readonly deliveryAreas: DeliveryAreaWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(id: string): Promise<void> {
    const result = await this.unitOfWork.run((context) =>
      this.deliveryAreas.delete(id, context),
    );

    if (result.status === 'not-found') {
      throw new DeliveryAreaNotFoundError();
    }
  }
}
