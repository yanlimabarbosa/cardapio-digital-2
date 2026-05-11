import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import {
  AdminOptionGroupSelectionPolicy,
  InvalidAdminOptionGroupSelectionError,
} from '../../domain/admin-option-group-selection.policy';
import { AdminOptionGroupValidationError } from '../errors/admin-option-group.errors';
import { AdminProductNotFoundError } from '../errors/admin-product.errors';
import type {
  AdminOptionGroupMutationModel,
  AdminOptionGroupWriteRepository,
  CreateAdminOptionGroupData,
} from '../ports/admin-option-group-write.repository.port';

export type CreateAdminOptionGroupCommand = {
  readonly maxSelections?: number;
  readonly minSelections?: number;
  readonly name: string;
  readonly productId: string;
  readonly sortOrder?: number;
};

export class CreateAdminOptionGroupUseCase {
  public constructor(
    private readonly optionGroups: AdminOptionGroupWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateAdminOptionGroupCommand): Promise<AdminOptionGroupMutationModel> {
    const selection = this.resolveSelection(command);
    const data: CreateAdminOptionGroupData =
      command.sortOrder !== undefined
        ? { name: command.name, ...selection, sortOrder: command.sortOrder }
        : { name: command.name, ...selection };

    const outcome = await this.unitOfWork.run((context) =>
      this.optionGroups.create(command.productId, data, context),
    );

    if (outcome.status === 'product-not-found') {
      throw new AdminProductNotFoundError(command.productId);
    }

    return outcome.optionGroup;
  }

  private resolveSelection(command: CreateAdminOptionGroupCommand): {
    readonly maxSelections: number;
    readonly minSelections: number;
  } {
    try {
      return AdminOptionGroupSelectionPolicy.for({
        minSelections: command.minSelections,
        maxSelections: command.maxSelections,
      }).resolveForCreate();
    } catch (error: unknown) {
      if (error instanceof InvalidAdminOptionGroupSelectionError) {
        throw new AdminOptionGroupValidationError(error.message);
      }

      throw error;
    }
  }
}
