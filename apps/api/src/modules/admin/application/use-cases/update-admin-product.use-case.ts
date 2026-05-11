import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import {
  AdminProductCategoryNotFoundError,
  AdminProductNotFoundError,
} from '../errors/admin-product.errors';
import type {
  AdminProductMutationModel,
  AdminProductWriteRepository,
  UpdateAdminProductData,
} from '../ports/admin-product-write.repository.port';

export type UpdateAdminProductCommand = UpdateAdminProductData & {
  readonly id: string;
};

export class UpdateAdminProductUseCase {
  public constructor(
    private readonly products: AdminProductWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: UpdateAdminProductCommand): Promise<AdminProductMutationModel> {
    const { id, ...data } = command;
    const outcome = await this.unitOfWork.run((context) =>
      this.products.update(id, data, context),
    );

    if (outcome.status === 'product-not-found') {
      throw new AdminProductNotFoundError(id);
    }

    if (outcome.status === 'category-not-found') {
      throw new AdminProductCategoryNotFoundError(outcome.categoryId);
    }

    return outcome.product;
  }
}
