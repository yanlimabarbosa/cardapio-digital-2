import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminProductNotFoundError } from '../errors/admin-product.errors';
import type { AdminProductWriteRepository } from '../ports/admin-product-write.repository.port';

export type DeleteAdminProductCommand = {
  readonly id: string;
};

export type DeleteAdminProductResult = {
  readonly success: true;
};

export class DeleteAdminProductUseCase {
  public constructor(
    private readonly products: AdminProductWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: DeleteAdminProductCommand): Promise<DeleteAdminProductResult> {
    const deleted = await this.unitOfWork.run((context) =>
      this.products.softDelete(command.id, context),
    );

    if (!deleted) {
      throw new AdminProductNotFoundError(command.id);
    }

    return { success: true };
  }
}
