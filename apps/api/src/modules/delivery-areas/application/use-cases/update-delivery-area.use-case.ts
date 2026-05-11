import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import {
  DeliveryAreaAlreadyExistsError,
  DeliveryAreaNotFoundError,
} from '../errors/delivery-area.errors';
import type {
  DeliveryAreaMutationModel,
  DeliveryAreaWriteRepository,
  UpdateDeliveryAreaData,
} from '../ports/delivery-area-write.repository.port';

export type UpdateDeliveryAreaCommand = UpdateDeliveryAreaData & {
  readonly id: string;
};

export class UpdateDeliveryAreaUseCase {
  public constructor(
    private readonly deliveryAreas: DeliveryAreaWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: UpdateDeliveryAreaCommand): Promise<DeliveryAreaMutationModel> {
    const data = this.toUpdateData(command);
    const result = await this.unitOfWork.run((context) =>
      this.deliveryAreas.update(command.id, data, context),
    );

    if (result.status === 'not-found') {
      throw new DeliveryAreaNotFoundError();
    }

    if (result.status === 'duplicate-normalized-key') {
      throw new DeliveryAreaAlreadyExistsError();
    }

    return result.area;
  }

  private toUpdateData(command: UpdateDeliveryAreaCommand): UpdateDeliveryAreaData {
    return {
      ...(command.neighborhood !== undefined ? { neighborhood: command.neighborhood } : {}),
      ...(command.city !== undefined ? { city: command.city } : {}),
      ...(command.fee !== undefined ? { fee: command.fee } : {}),
      ...(command.isActive !== undefined ? { isActive: command.isActive } : {}),
    };
  }
}
