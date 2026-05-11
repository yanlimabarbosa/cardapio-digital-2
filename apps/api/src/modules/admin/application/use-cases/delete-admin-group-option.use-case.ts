import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminGroupOptionNotFoundError } from '../errors/admin-product-extra.errors';
import type { AdminProductExtraWriteRepository } from '../ports/admin-product-extra-write.repository.port';

export type DeleteAdminGroupOptionCommand = {
  readonly id: string;
};

export type DeleteAdminGroupOptionResult = {
  readonly success: boolean;
};

export class DeleteAdminGroupOptionUseCase {
  public constructor(
    private readonly extras: AdminProductExtraWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: DeleteAdminGroupOptionCommand,
  ): Promise<DeleteAdminGroupOptionResult> {
    const deleted = await this.unitOfWork.run((context) =>
      this.extras.softDelete(command.id, context),
    );

    if (!deleted) {
      throw new AdminGroupOptionNotFoundError(command.id);
    }

    return { success: true };
  }
}
