import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminOptionGroupWriteRepository,
  ReorderAdminOptionGroupItem,
} from '../ports/admin-option-group-write.repository.port';

export type ReorderAdminOptionGroupsCommand = {
  readonly items: readonly ReorderAdminOptionGroupItem[];
};

export type ReorderAdminOptionGroupsResult = {
  readonly success: true;
};

export class ReorderAdminOptionGroupsUseCase {
  public constructor(
    private readonly optionGroups: AdminOptionGroupWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: ReorderAdminOptionGroupsCommand,
  ): Promise<ReorderAdminOptionGroupsResult> {
    await this.unitOfWork.run((context) => this.optionGroups.reorder(command.items, context));

    return { success: true };
  }
}
