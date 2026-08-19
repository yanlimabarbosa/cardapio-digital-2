import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import {
  AdminOptionGroupNotFoundError,
  AdminOptionGroupValidationError,
} from '../errors/admin-option-group.errors';
import type {
  AdminOptionGroupMutationModel,
  AdminOptionGroupWriteRepository,
  UpdateAdminOptionGroupData,
} from '../ports/admin-option-group-write.repository.port';

export type UpdateAdminOptionGroupCommand = {
  readonly combinedLimitId?: string | null;
  readonly id: string;
  readonly isActive?: boolean;
  readonly maxSelections?: number;
  readonly minSelections?: number;
  readonly name?: string;
  readonly sortOrder?: number;
};

export class UpdateAdminOptionGroupUseCase {
  public constructor(
    private readonly optionGroups: AdminOptionGroupWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: UpdateAdminOptionGroupCommand): Promise<AdminOptionGroupMutationModel> {
    const data: UpdateAdminOptionGroupData = {
      ...(command.name !== undefined ? { name: command.name } : {}),
      ...(command.minSelections !== undefined ? { minSelections: command.minSelections } : {}),
      ...(command.maxSelections !== undefined ? { maxSelections: command.maxSelections } : {}),
      ...(command.sortOrder !== undefined ? { sortOrder: command.sortOrder } : {}),
      ...(command.isActive !== undefined ? { isActive: command.isActive } : {}),
      ...(command.combinedLimitId !== undefined ? { combinedLimitId: command.combinedLimitId } : {}),
    };

    const outcome = await this.unitOfWork.run((context) =>
      this.optionGroups.update(command.id, data, context),
    );

    if (outcome.status === 'option-group-not-found') {
      throw new AdminOptionGroupNotFoundError(command.id);
    }

    if (outcome.status === 'invalid-selection-range') {
      throw new AdminOptionGroupValidationError(outcome.message);
    }

    return outcome.optionGroup;
  }
}
