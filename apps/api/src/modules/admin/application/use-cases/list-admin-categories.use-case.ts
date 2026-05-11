import type { AdminCategoryReadRepository } from '../ports/admin-category.read-repository.port';
import type { AdminCategoryReadModel } from '../read-models/admin-category.read-model';

export type ListAdminCategoriesResult = readonly AdminCategoryReadModel[];

export class ListAdminCategoriesUseCase {
  public constructor(private readonly categories: AdminCategoryReadRepository) {}

  public execute(): Promise<ListAdminCategoriesResult> {
    return this.categories.list();
  }
}
