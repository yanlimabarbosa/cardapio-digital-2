import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminProductNotFoundError } from '../errors/admin-product.errors';
import type { AdminProductWriteRepository } from '../ports/admin-product-write.repository.port';

export type ToggleAdminProductCommand = {
  readonly id: string;
};

export type ToggleAdminProductResult = {
  readonly id: string;
  readonly isActive: boolean;
};

export class ToggleAdminProductUseCase {
  public constructor(
    private readonly products: AdminProductWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: ToggleAdminProductCommand): Promise<ToggleAdminProductResult> {
    const product = await this.unitOfWork.run((context) =>
      this.products.toggleActive(command.id, context),
    );

    if (!product) {
      throw new AdminProductNotFoundError(command.id);
    }

    return {
      id: product.id,
      isActive: product.isActive,
    };
  }
}
