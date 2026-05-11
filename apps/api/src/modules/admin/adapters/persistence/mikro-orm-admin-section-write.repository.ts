import { normalizeWeeklySchedule } from '@cardapio/shared';
import { Product, Section, SectionProduct } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  AdminSectionCreateMutationModel,
  AdminSectionMutationModel,
  AdminSectionWriteRepository,
  CreateAdminSectionData,
  ReorderAdminSectionItem,
  SetAdminSectionProductsResult,
  UpdateAdminSectionData,
} from '../../application/ports/admin-section-write.repository.port';

export class MikroOrmAdminSectionWriteRepository implements AdminSectionWriteRepository {
  public async create(
    data: CreateAdminSectionData,
    context: TransactionContext,
  ): Promise<AdminSectionCreateMutationModel> {
    const em = getMikroOrmEntityManager(context);
    const sortOrder = await em.count(Section, {});
    const section = em.create(Section, {
      label: data.label,
      emoji: data.emoji || '',
      sortOrder,
      availabilitySchedule: normalizeWeeklySchedule(data.availabilitySchedule) ?? null,
    });

    await em.flush();

    return {
      id: section.id,
      label: section.label,
      emoji: section.emoji,
      sortOrder: section.sortOrder ?? 0,
      isActive: section.isActive ?? true,
      availabilitySchedule: section.availabilitySchedule ?? null,
      productCount: 0,
      products: [],
    };
  }

  public async delete(id: string, context: TransactionContext): Promise<boolean> {
    const em = getMikroOrmEntityManager(context);
    const section = await em.findOne(Section, { id });

    if (!section) {
      return false;
    }

    await em.removeAndFlush(section);

    return true;
  }

  public async reorder(
    items: readonly ReorderAdminSectionItem[],
    context: TransactionContext,
  ): Promise<void> {
    const em = getMikroOrmEntityManager(context);

    for (const item of items) {
      const section = await em.findOne(Section, { id: item.id });

      if (section) {
        section.sortOrder = item.sortOrder;
      }
    }

    await em.flush();
  }

  public async setProducts(
    sectionId: string,
    productIds: readonly string[],
    context: TransactionContext,
  ): Promise<SetAdminSectionProductsResult> {
    const em = getMikroOrmEntityManager(context);
    const section = await em.findOne(Section, { id: sectionId }, { populate: ['products'] });

    if (!section) {
      return { status: 'section-not-found' };
    }

    const products: Product[] = [];

    for (const productId of productIds) {
      const product = await em.findOne(Product, { id: productId });

      if (!product) {
        return { status: 'product-not-found', productId };
      }

      products.push(product);
    }

    for (const sectionProduct of section.products.getItems()) {
      em.remove(sectionProduct);
    }

    products.forEach((product, sortOrder): void => {
      em.create(SectionProduct, {
        section,
        product,
        sortOrder,
      });
    });

    await em.flush();

    return { status: 'success' };
  }

  public async update(
    id: string,
    data: UpdateAdminSectionData,
    context: TransactionContext,
  ): Promise<AdminSectionMutationModel | null> {
    const em = getMikroOrmEntityManager(context);
    const section = await em.findOne(Section, { id });

    if (!section) {
      return null;
    }

    if (data.label !== undefined) {
      section.label = data.label;
    }

    if (data.emoji !== undefined) {
      section.emoji = data.emoji;
    }

    if (data.isActive !== undefined) {
      section.isActive = data.isActive;
    }

    if (data.availabilitySchedule !== undefined) {
      section.availabilitySchedule = normalizeWeeklySchedule(data.availabilitySchedule) ?? null;
    }

    await em.flush();

    return this.toMutationModel(section);
  }

  private toMutationModel(section: Section): AdminSectionMutationModel {
    return {
      id: section.id,
      label: section.label,
      emoji: section.emoji,
      sortOrder: section.sortOrder ?? 0,
      isActive: section.isActive ?? true,
      availabilitySchedule: section.availabilitySchedule ?? null,
    };
  }
}
