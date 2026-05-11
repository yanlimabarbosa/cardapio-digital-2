import type { MenuReadRepository } from '../ports/menu-read-repository.port';
import type { ProductReadModel } from '../read-models/product.read-model';

export type GetFeaturedProductsCommand = {
  readonly scheduledFor?: string;
};

export type GetFeaturedProductsResult = readonly ProductReadModel[];

export class GetFeaturedProductsUseCase {
  public constructor(private readonly menuReadRepository: MenuReadRepository) {}

  public execute(command: GetFeaturedProductsCommand = {}): Promise<GetFeaturedProductsResult> {
    return this.menuReadRepository.getFeaturedProducts(command);
  }
}
