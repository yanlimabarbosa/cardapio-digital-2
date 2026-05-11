import type { AdminProductReadRepository } from '../ports/admin-product.read-repository.port';
import type { AdminProductReadModel } from '../read-models/admin-product.read-model';

export class ListAdminProductsUseCase {
  public constructor(private readonly products: AdminProductReadRepository) {}

  public async execute(): Promise<readonly AdminProductReadModel[]> {
    return this.products.list();
  }
}
