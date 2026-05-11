import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminSectionNotFoundError } from '../errors/admin-section.errors';
import type {
  AdminSectionMutationModel,
  AdminSectionWriteRepository,
  UpdateAdminSectionData,
} from '../ports/admin-section-write.repository.port';

export type UpdateAdminSectionCommand = UpdateAdminSectionData & {
  readonly id: string;
};

export class UpdateAdminSectionUseCase {
  public constructor(
    private readonly sections: AdminSectionWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: UpdateAdminSectionCommand): Promise<AdminSectionMutationModel> {
    const { id, ...data } = command;
    const section = await this.unitOfWork.run((context) => this.sections.update(id, data, context));

    if (!section) {
      throw new AdminSectionNotFoundError(id);
    }

    return section;
  }
}
