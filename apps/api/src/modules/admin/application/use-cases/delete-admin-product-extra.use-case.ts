import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminProductExtraNotFoundError } from '../errors/admin-product-extra.errors';
import type { AdminProductExtraWriteRepository } from '../ports/admin-product-extra-write.repository.port';

export type DeleteAdminProductExtraCommand = {
  readonly id: string;
};

export type DeleteAdminProductExtraResult = {
  readonly success: boolean;
};

export class DeleteAdminProductExtraUseCase {
  public constructor(
    private readonly extras: AdminProductExtraWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: DeleteAdminProductExtraCommand,
  ): Promise<DeleteAdminProductExtraResult> {
    const deleted = await this.unitOfWork.run((context) =>
      this.extras.softDelete(command.id, context),
    );

    if (!deleted) {
      throw new AdminProductExtraNotFoundError(command.id);
    }

    return { success: true };
  }
}
