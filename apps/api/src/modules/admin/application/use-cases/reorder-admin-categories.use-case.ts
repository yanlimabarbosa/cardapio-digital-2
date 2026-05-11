import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminCategoryWriteRepository,
  ReorderAdminCategoryItem,
} from '../ports/admin-category-write.repository.port';

export type ReorderAdminCategoriesCommand = {
  readonly items: readonly ReorderAdminCategoryItem[];
};

export type ReorderAdminCategoriesResult = {
  readonly success: true;
};

export class ReorderAdminCategoriesUseCase {
  public constructor(
    private readonly categories: AdminCategoryWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: ReorderAdminCategoriesCommand): Promise<ReorderAdminCategoriesResult> {
    await this.unitOfWork.run((context) => this.categories.reorder(command.items, context));

    return { success: true };
  }
}
