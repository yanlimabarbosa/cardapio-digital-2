import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { AdminProductCategoryNotFoundError } from '../errors/admin-product.errors';
import type {
  AdminProductMutationModel,
  AdminProductWriteRepository,
  CreateAdminProductData,
} from '../ports/admin-product-write.repository.port';

export type CreateAdminProductCommand = CreateAdminProductData;

export class CreateAdminProductUseCase {
  public constructor(
    private readonly products: AdminProductWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: CreateAdminProductCommand): Promise<AdminProductMutationModel> {
    const outcome = await this.unitOfWork.run((context) =>
      this.products.create(command, context),
    );

    if (outcome.status === 'category-not-found') {
      throw new AdminProductCategoryNotFoundError(outcome.categoryId);
    }

    return outcome.product;
  }
}
