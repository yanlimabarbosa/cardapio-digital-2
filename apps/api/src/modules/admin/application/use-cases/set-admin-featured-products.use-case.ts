import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type { AdminProductWriteRepository } from '../ports/admin-product-write.repository.port';

export type SetAdminFeaturedProductsCommand = {
  readonly productIds: readonly string[];
};

export type SetAdminFeaturedProductsResult = {
  readonly success: true;
};

export class SetAdminFeaturedProductsUseCase {
  public constructor(
    private readonly products: AdminProductWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: SetAdminFeaturedProductsCommand): Promise<SetAdminFeaturedProductsResult> {
    await this.unitOfWork.run((context) => this.products.setFeatured(command.productIds, context));

    return { success: true };
  }
}
