import { AdminProductNotFoundError } from '../errors/admin-product.errors';
import type { AdminProductReadRepository } from '../ports/admin-product.read-repository.port';
import type { AdminProductExtraListReadModel } from '../read-models/admin-product-extra.read-model';

export type ListAdminProductExtrasCommand = {
  readonly productId: string;
};

export class ListAdminProductExtrasUseCase {
  public constructor(private readonly products: AdminProductReadRepository) {}

  public async execute(
    command: ListAdminProductExtrasCommand,
  ): Promise<readonly AdminProductExtraListReadModel[]> {
    const extras = await this.products.listExtras(command.productId);

    if (!extras) {
      throw new AdminProductNotFoundError(command.productId);
    }

    return extras;
  }
}
