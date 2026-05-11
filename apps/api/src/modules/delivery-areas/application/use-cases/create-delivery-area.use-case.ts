import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { DeliveryAreaKeyPolicy } from '../../domain/delivery-area-key.policy';
import { DeliveryAreaAlreadyExistsError } from '../errors/delivery-area.errors';
import type {
  DeliveryAreaMutationModel,
  DeliveryAreaWriteRepository,
} from '../ports/delivery-area-write.repository.port';

export type CreateDeliveryAreaCommand = {
  readonly city: string;
  readonly fee: number;
  readonly neighborhood: string;
};

export class CreateDeliveryAreaUseCase {
  public constructor(
    private readonly deliveryAreas: DeliveryAreaWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateDeliveryAreaCommand): Promise<DeliveryAreaMutationModel> {
    const normalizedKey = DeliveryAreaKeyPolicy.create(command).normalizedKey();
    const result = await this.unitOfWork.run((context) =>
      this.deliveryAreas.create({ ...command, normalizedKey }, context),
    );

    if (result.status === 'duplicate-normalized-key') {
      throw new DeliveryAreaAlreadyExistsError();
    }

    return result.area;
  }
}
