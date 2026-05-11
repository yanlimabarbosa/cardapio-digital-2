import type { UnitOfWork } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type {
  AdminProductWriteRepository,
  ReorderAdminProductItem,
} from '../ports/admin-product-write.repository.port';

export type ReorderAdminProductsCommand = {
  readonly items: readonly ReorderAdminProductItem[];
};

export type ReorderAdminProductsResult = {
  readonly success: true;
};

export class ReorderAdminProductsUseCase {
  public constructor(
    private readonly products: AdminProductWriteRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  public async execute(command: ReorderAdminProductsCommand): Promise<ReorderAdminProductsResult> {
    await this.unitOfWork.run((context) => this.products.reorder(command.items, context));

    return { success: true };
  }
}
