import { EntityManager } from '@mikro-orm/postgresql';
import { Category } from '../../../../entities';
import type { AdminCategoryReadRepository } from '../../application/ports/admin-category.read-repository.port';
import type { AdminCategoryReadModel } from '../../application/read-models/admin-category.read-model';

export class MikroOrmAdminCategoryReadRepository implements AdminCategoryReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async list(): Promise<readonly AdminCategoryReadModel[]> {
    const categories = await this.em.find(
      Category,
      { isArchived: false },
      { orderBy: { sortOrder: 'ASC' }, populate: ['products'] },
    );

    return categories.map((category: Category): AdminCategoryReadModel => this.toReadModel(category));
  }

  private toReadModel(category: Category): AdminCategoryReadModel {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive ?? true,
      availabilitySchedule: category.availabilitySchedule ?? null,
      productCount: category.products.getItems().filter((product) => !(product.isArchived ?? false)).length,
      createdAt: category.createdAt,
    };
  }
}
