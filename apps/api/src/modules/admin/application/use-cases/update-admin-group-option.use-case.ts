import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminGroupOptionNotFoundError } from '../errors/admin-product-extra.errors';
import type {
  AdminProductExtraMutationModel,
  AdminProductExtraWriteRepository,
  UpdateAdminProductExtraData,
} from '../ports/admin-product-extra-write.repository.port';

export type UpdateAdminGroupOptionCommand = UpdateAdminProductExtraData & {
  readonly id: string;
};

export class UpdateAdminGroupOptionUseCase {
  public constructor(
    private readonly extras: AdminProductExtraWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: UpdateAdminGroupOptionCommand,
  ): Promise<AdminProductExtraMutationModel> {
    const data: UpdateAdminProductExtraData = this.toUpdateData(command);
    const outcome = await this.unitOfWork.run((context) =>
      this.extras.update(command.id, data, context),
    );

    if (outcome.status === 'extra-not-found') {
      throw new AdminGroupOptionNotFoundError(command.id);
    }

    return outcome.extra;
  }

  private toUpdateData(command: UpdateAdminGroupOptionCommand): UpdateAdminProductExtraData {
    const data: {
      imageUrl?: string;
      isActive?: boolean;
      isSoldOut?: boolean;
      name?: string;
      price?: number;
    } = {};

    if (command.name !== undefined) {
      data.name = command.name;
    }

    if (command.price !== undefined) {
      data.price = command.price;
    }

    if (command.imageUrl !== undefined) {
      data.imageUrl = command.imageUrl;
    }

    if (command.isActive !== undefined) {
      data.isActive = command.isActive;
    }

    if (command.isSoldOut !== undefined) {
      data.isSoldOut = command.isSoldOut;
    }

    return data;
  }
}
