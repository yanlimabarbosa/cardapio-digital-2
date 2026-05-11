import type { MenuReadRepository } from '../ports/menu-read-repository.port';
import type { ProductReadModel } from '../read-models/product.read-model';

export type GetProductsByIdsCommand = {
  readonly ids: readonly string[];
  readonly scheduledFor?: string;
};

export type GetProductsByIdsResult = readonly ProductReadModel[];

export class GetProductsByIdsUseCase {
  public constructor(private readonly menuReadRepository: MenuReadRepository) {}

  public execute(command: GetProductsByIdsCommand): Promise<GetProductsByIdsResult> {
    return this.menuReadRepository.getProductsByIds(command);
  }
}
