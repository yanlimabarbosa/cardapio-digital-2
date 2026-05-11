import type { AdminSectionReadModel } from '../read-models/admin-section.read-model';

export const ADMIN_SECTION_READ_REPOSITORY = Symbol('ADMIN_SECTION_READ_REPOSITORY');

export interface AdminSectionReadRepository {
  list(): Promise<readonly AdminSectionReadModel[]>;
}
