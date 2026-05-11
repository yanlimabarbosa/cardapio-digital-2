import { AdminProductNotFoundError } from '../errors/admin-product.errors';
import type { AdminProductReadRepository } from '../ports/admin-product.read-repository.port';
import type { AdminOptionGroupReadModel } from '../read-models/admin-option-group.read-model';

export type ListAdminOptionGroupsCommand = {
  readonly productId: string;
};

export class ListAdminOptionGroupsUseCase {
  public constructor(private readonly products: AdminProductReadRepository) {}

  public async execute(
    command: ListAdminOptionGroupsCommand,
  ): Promise<readonly AdminOptionGroupReadModel[]> {
    const optionGroups = await this.products.listOptionGroups(command.productId);

    if (!optionGroups) {
      throw new AdminProductNotFoundError(command.productId);
    }

    return optionGroups;
  }
}
