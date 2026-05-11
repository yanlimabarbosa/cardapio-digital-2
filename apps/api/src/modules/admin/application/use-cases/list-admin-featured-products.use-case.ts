import type { AdminProductReadRepository } from '../ports/admin-product.read-repository.port';
import type { AdminFeaturedProductReadModel } from '../read-models/admin-featured-product.read-model';

export class ListAdminFeaturedProductsUseCase {
  public constructor(private readonly products: AdminProductReadRepository) {}

  public async execute(): Promise<readonly AdminFeaturedProductReadModel[]> {
    return this.products.listFeatured();
  }
}
