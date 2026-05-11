import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type { AdminCategoryWriteRepository } from '../ports/admin-category-write.repository.port';

export type DeleteAdminCategoryCommand = {
  readonly id: string;
};

export type DeleteAdminCategoryResult = {
  readonly success: true;
};

export class AdminCategoryNotFoundError extends Error {
  public override readonly name = 'AdminCategoryNotFoundError';

  public constructor(id: string) {
    super(`Category ${id} not found`);
  }
}

export class DeleteAdminCategoryUseCase {
  public constructor(
    private readonly categories: AdminCategoryWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: DeleteAdminCategoryCommand): Promise<DeleteAdminCategoryResult> {
    const deleted = await this.unitOfWork.run((context) =>
      this.categories.softDelete(command.id, context),
    );

    if (!deleted) {
      throw new AdminCategoryNotFoundError(command.id);
    }

    return { success: true };
  }
}
