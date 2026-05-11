import { normalizeWeeklySchedule } from '@cardapio/shared';
import { Category } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  AdminCategoryMutationModel,
  AdminCategoryWriteRepository,
  CreateAdminCategoryData,
  ReorderAdminCategoryItem,
  UpdateAdminCategoryData,
} from '../../application/ports/admin-category-write.repository.port';

export class MikroOrmAdminCategoryWriteRepository implements AdminCategoryWriteRepository {
  public async create(
    data: CreateAdminCategoryData,
    context: TransactionContext,
  ): Promise<AdminCategoryMutationModel> {
    const em = getMikroOrmEntityManager(context);
    const category = em.create(Category, {
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      sortOrder: data.sortOrder ?? 0,
      availabilitySchedule: normalizeWeeklySchedule(data.availabilitySchedule) ?? null,
    });

    await em.flush();

    return this.toMutationModel(category);
  }

  public async reorder(
    items: readonly ReorderAdminCategoryItem[],
    context: TransactionContext,
  ): Promise<void> {
    const em = getMikroOrmEntityManager(context);

    for (const item of items) {
      const category = await em.findOne(Category, { id: item.id });

      if (category) {
        category.sortOrder = item.sortOrder;
      }
    }

    await em.flush();
  }

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    const em = getMikroOrmEntityManager(context);
    const category = await em.findOne(Category, { id });

    if (!category) {
      return false;
    }

    category.isActive = false;
    await em.flush();

    return true;
  }

  public async update(
    id: string,
    data: UpdateAdminCategoryData,
    context: TransactionContext,
  ): Promise<AdminCategoryMutationModel | null> {
    const em = getMikroOrmEntityManager(context);
    const category = await em.findOne(Category, { id });

    if (!category) {
      return null;
    }

    if (data.name !== undefined) {
      category.name = data.name;
    }

    if (data.description !== undefined) {
      category.description = data.description;
    }

    if (data.imageUrl !== undefined) {
      category.imageUrl = data.imageUrl;
    }

    if (data.sortOrder !== undefined) {
      category.sortOrder = data.sortOrder;
    }

    if (data.isActive !== undefined) {
      category.isActive = data.isActive;
    }

    if (data.availabilitySchedule !== undefined) {
      category.availabilitySchedule = normalizeWeeklySchedule(data.availabilitySchedule) ?? null;
    }

    await em.flush();

    return this.toMutationModel(category);
  }

  private toMutationModel(category: Category): AdminCategoryMutationModel {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive ?? true,
      availabilitySchedule: category.availabilitySchedule,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
