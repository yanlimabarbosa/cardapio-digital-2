import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminSectionNotFoundError } from '../errors/admin-section.errors';
import type { AdminSectionWriteRepository } from '../ports/admin-section-write.repository.port';

export type DeleteAdminSectionCommand = {
  readonly id: string;
};

export type DeleteAdminSectionResult = {
  readonly success: true;
};

export class DeleteAdminSectionUseCase {
  public constructor(
    private readonly sections: AdminSectionWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: DeleteAdminSectionCommand): Promise<DeleteAdminSectionResult> {
    const deleted = await this.unitOfWork.run((context) =>
      this.sections.delete(command.id, context),
    );

    if (!deleted) {
      throw new AdminSectionNotFoundError(command.id);
    }

    return { success: true };
  }
}
