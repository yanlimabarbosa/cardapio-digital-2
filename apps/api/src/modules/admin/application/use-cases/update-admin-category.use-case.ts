import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminCategoryMutationModel,
  AdminCategoryWriteRepository,
  UpdateAdminCategoryData,
} from '../ports/admin-category-write.repository.port';

export type UpdateAdminCategoryCommand = UpdateAdminCategoryData & {
  readonly id: string;
};

export class UpdateAdminCategoryNotFoundError extends Error {
  public override readonly name = 'UpdateAdminCategoryNotFoundError';

  public constructor(id: string) {
    super(`Category ${id} not found`);
  }
}

export class UpdateAdminCategoryUseCase {
  public constructor(
    private readonly categories: AdminCategoryWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: UpdateAdminCategoryCommand): Promise<AdminCategoryMutationModel> {
    const { id, ...data } = command;
    const category = await this.unitOfWork.run((context) =>
      this.categories.update(id, data, context),
    );

    if (!category) {
      throw new UpdateAdminCategoryNotFoundError(id);
    }

    return category;
  }
}
