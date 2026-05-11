import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminSectionCreateMutationModel,
  AdminSectionWriteRepository,
  CreateAdminSectionData,
} from '../ports/admin-section-write.repository.port';

export type CreateAdminSectionCommand = CreateAdminSectionData;

export class CreateAdminSectionUseCase {
  public constructor(
    private readonly sections: AdminSectionWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateAdminSectionCommand): Promise<AdminSectionCreateMutationModel> {
    return this.unitOfWork.run((context) => this.sections.create(command, context));
  }
}
