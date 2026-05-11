import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminOptionGroupNotFoundError } from '../errors/admin-option-group.errors';
import type {
  AdminProductExtraMutationModel,
  AdminProductExtraWriteRepository,
  CreateAdminProductExtraData,
} from '../ports/admin-product-extra-write.repository.port';

export type CreateAdminGroupOptionCommand = CreateAdminProductExtraData & {
  readonly groupId: string;
};

export class CreateAdminGroupOptionUseCase {
  public constructor(
    private readonly extras: AdminProductExtraWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: CreateAdminGroupOptionCommand,
  ): Promise<AdminProductExtraMutationModel> {
    const data: CreateAdminProductExtraData =
      command.imageUrl !== undefined
        ? { name: command.name, price: command.price, imageUrl: command.imageUrl }
        : { name: command.name, price: command.price };

    const outcome = await this.unitOfWork.run((context) =>
      this.extras.createForOptionGroup(command.groupId, data, context),
    );

    if (outcome.status === 'option-group-not-found') {
      throw new AdminOptionGroupNotFoundError(command.groupId);
    }

    return outcome.extra;
  }
}
