import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminSectionWriteRepository,
  ReorderAdminSectionItem,
} from '../ports/admin-section-write.repository.port';

export type ReorderAdminSectionsCommand = {
  readonly ids: readonly string[];
};

export class ReorderAdminSectionsUseCase {
  public constructor(
    private readonly sections: AdminSectionWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: ReorderAdminSectionsCommand): Promise<void> {
    const items = this.toReorderItems(command.ids);

    await this.unitOfWork.run((context) => this.sections.reorder(items, context));
  }

  private toReorderItems(ids: readonly string[]): readonly ReorderAdminSectionItem[] {
    return ids.map((id, sortOrder) => ({ id, sortOrder }));
  }
}
