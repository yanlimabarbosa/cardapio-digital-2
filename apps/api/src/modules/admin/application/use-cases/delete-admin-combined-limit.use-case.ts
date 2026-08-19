import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminCombinedLimitNotFoundError } from '../errors/admin-combined-limit.errors';
import type { AdminCombinedLimitWriteRepository } from '../ports/admin-combined-limit-write.repository.port';

export type DeleteAdminCombinedLimitCommand = {
  readonly id: string;
};

export type DeleteAdminCombinedLimitResult = {
  readonly success: boolean;
};

export class DeleteAdminCombinedLimitUseCase {
  public constructor(
    private readonly combinedLimits: AdminCombinedLimitWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: DeleteAdminCombinedLimitCommand,
  ): Promise<DeleteAdminCombinedLimitResult> {
    const deleted = await this.unitOfWork.run((context) =>
      this.combinedLimits.softDelete(command.id, context),
    );

    if (!deleted) {
      throw new AdminCombinedLimitNotFoundError(command.id);
    }

    return { success: true };
  }
}
