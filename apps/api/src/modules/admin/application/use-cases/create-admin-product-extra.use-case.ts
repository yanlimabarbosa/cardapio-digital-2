import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminProductNotFoundError } from '../errors/admin-product.errors';
import type {
  AdminProductExtraMutationModel,
  AdminProductExtraWriteRepository,
  CreateAdminProductExtraData,
} from '../ports/admin-product-extra-write.repository.port';

export type CreateAdminProductExtraCommand = CreateAdminProductExtraData & {
  readonly productId: string;
};

export class CreateAdminProductExtraUseCase {
  public constructor(
    private readonly extras: AdminProductExtraWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: CreateAdminProductExtraCommand,
  ): Promise<AdminProductExtraMutationModel> {
    const data: CreateAdminProductExtraData =
      command.imageUrl !== undefined
        ? { name: command.name, price: command.price, imageUrl: command.imageUrl }
        : { name: command.name, price: command.price };

    const outcome = await this.unitOfWork.run((context) =>
      this.extras.create(command.productId, data, context),
    );

    if (outcome.status === 'product-not-found') {
      throw new AdminProductNotFoundError(command.productId);
    }

    return outcome.extra;
  }
}
