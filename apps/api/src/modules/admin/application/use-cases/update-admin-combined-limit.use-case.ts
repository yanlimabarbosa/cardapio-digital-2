import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminCombinedLimitNotFoundError } from '../errors/admin-combined-limit.errors';
import type {
  AdminCombinedLimitMutationModel,
  AdminCombinedLimitWriteRepository,
  UpdateAdminCombinedLimitData,
} from '../ports/admin-combined-limit-write.repository.port';

export type UpdateAdminCombinedLimitCommand = {
  readonly id: string;
  readonly maxSelections?: number;
  readonly name?: string;
};

export class UpdateAdminCombinedLimitUseCase {
  public constructor(
    private readonly combinedLimits: AdminCombinedLimitWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: UpdateAdminCombinedLimitCommand,
  ): Promise<AdminCombinedLimitMutationModel> {
    const data: UpdateAdminCombinedLimitData = {
      ...(command.name !== undefined ? { name: command.name } : {}),
      ...(command.maxSelections !== undefined ? { maxSelections: command.maxSelections } : {}),
    };

    const outcome = await this.unitOfWork.run((context) =>
      this.combinedLimits.update(command.id, data, context),
    );

    if (outcome.status === 'combined-limit-not-found') {
      throw new AdminCombinedLimitNotFoundError(command.id);
    }

    return outcome.combinedLimit;
  }
}
