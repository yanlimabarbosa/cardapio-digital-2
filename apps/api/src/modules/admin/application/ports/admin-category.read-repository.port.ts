import type { AdminCategoryReadModel } from '../read-models/admin-category.read-model';

export const ADMIN_CATEGORY_READ_REPOSITORY = Symbol('ADMIN_CATEGORY_READ_REPOSITORY');

export interface AdminCategoryReadRepository {
  list(): Promise<readonly AdminCategoryReadModel[]>;
}
