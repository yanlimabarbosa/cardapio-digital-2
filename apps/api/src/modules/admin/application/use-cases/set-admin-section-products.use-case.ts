import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import {
  AdminSectionNotFoundError,
  AdminSectionProductNotFoundError,
} from '../errors/admin-section.errors';
import type { AdminSectionWriteRepository } from '../ports/admin-section-write.repository.port';

export type SetAdminSectionProductsCommand = {
  readonly productIds: readonly string[];
  readonly sectionId: string;
};

export class SetAdminSectionProductsUseCase {
  public constructor(
    private readonly sections: AdminSectionWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: SetAdminSectionProductsCommand): Promise<void> {
    const result = await this.unitOfWork.run((context) =>
      this.sections.setProducts(command.sectionId, command.productIds, context),
    );

    if (result.status === 'section-not-found') {
      throw new AdminSectionNotFoundError(command.sectionId);
    }

    if (result.status === 'product-not-found') {
      throw new AdminSectionProductNotFoundError(result.productId);
    }
  }
}
