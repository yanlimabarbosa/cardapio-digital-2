import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminOptionGroupNotFoundError } from '../errors/admin-option-group.errors';
import type { AdminOptionGroupWriteRepository } from '../ports/admin-option-group-write.repository.port';

export type DeleteAdminOptionGroupCommand = {
  readonly id: string;
};

export type DeleteAdminOptionGroupResult = {
  readonly success: boolean;
};

export class DeleteAdminOptionGroupUseCase {
  public constructor(
    private readonly optionGroups: AdminOptionGroupWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: DeleteAdminOptionGroupCommand,
  ): Promise<DeleteAdminOptionGroupResult> {
    const deleted = await this.unitOfWork.run((context) =>
      this.optionGroups.softDelete(command.id, context),
    );

    if (!deleted) {
      throw new AdminOptionGroupNotFoundError(command.id);
    }

    return { success: true };
  }
}
