import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminProductNotFoundError } from '../errors/admin-product.errors';
import type {
  AdminCombinedLimitMutationModel,
  AdminCombinedLimitWriteRepository,
  CreateAdminCombinedLimitData,
} from '../ports/admin-combined-limit-write.repository.port';

export type CreateAdminCombinedLimitCommand = {
  readonly maxSelections: number;
  readonly name: string;
  readonly productId: string;
};

export class CreateAdminCombinedLimitUseCase {
  public constructor(
    private readonly combinedLimits: AdminCombinedLimitWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: CreateAdminCombinedLimitCommand,
  ): Promise<AdminCombinedLimitMutationModel> {
    const data: CreateAdminCombinedLimitData = {
      name: command.name,
      maxSelections: command.maxSelections,
    };

    const outcome = await this.unitOfWork.run((context) =>
      this.combinedLimits.create(command.productId, data, context),
    );

    if (outcome.status === 'product-not-found') {
      throw new AdminProductNotFoundError(command.productId);
    }

    return outcome.combinedLimit;
  }
}
