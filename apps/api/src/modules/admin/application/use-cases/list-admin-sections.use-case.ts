import type { AdminSectionReadRepository } from '../ports/admin-section.read-repository.port';
import type { AdminSectionReadModel } from '../read-models/admin-section.read-model';

export class ListAdminSectionsUseCase {
  public constructor(private readonly sections: AdminSectionReadRepository) {}

  public async execute(): Promise<readonly AdminSectionReadModel[]> {
    return this.sections.list();
  }
}
