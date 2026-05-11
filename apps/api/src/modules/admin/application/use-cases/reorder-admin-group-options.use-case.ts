import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminProductExtraWriteRepository,
  ReorderAdminProductExtraItem,
} from '../ports/admin-product-extra-write.repository.port';

export type ReorderAdminGroupOptionsCommand = {
  readonly items: readonly ReorderAdminProductExtraItem[];
};

export type ReorderAdminGroupOptionsResult = {
  readonly success: boolean;
};

export class ReorderAdminGroupOptionsUseCase {
  public constructor(
    private readonly extras: AdminProductExtraWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(
    command: ReorderAdminGroupOptionsCommand,
  ): Promise<ReorderAdminGroupOptionsResult> {
    await this.unitOfWork.run((context) => this.extras.reorder(command.items, context));

    return { success: true };
  }
}
