import { Category, Product } from '../../../../entities';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  AdminProductActiveState,
  AdminProductMutationModel,
  AdminProductWriteRepository,
  CreateAdminProductData,
  CreateAdminProductOutcome,
  ReorderAdminProductItem,
  UpdateAdminProductData,
  UpdateAdminProductOutcome,
} from '../../application/ports/admin-product-write.repository.port';

export class MikroOrmAdminProductWriteRepository implements AdminProductWriteRepository {
  public async create(
    data: CreateAdminProductData,
    context: TransactionContext,
  ): Promise<CreateAdminProductOutcome> {
    const em = getMikroOrmEntityManager(context);
    const category = await em.findOne(Category, { id: data.categoryId });

    if (!category) {
      return { status: 'category-not-found', categoryId: data.categoryId };
    }

    const product = em.create(Product, {
      name: data.name,
      category,
      price: data.price.toFixed(2),
      description: data.description,
      imageUrl: data.imageUrl,
      isCompound: data.isCompound ?? false,
      isRedeemable: data.isRedeemable ?? false,
      redemptionCost: data.redemptionCost ?? 0,
    });

    await em.flush();

    return { status: 'created', product: this.toMutationModel(product) };
  }

  public async reorder(
    items: readonly ReorderAdminProductItem[],
    context: TransactionContext,
  ): Promise<void> {
    const em = getMikroOrmEntityManager(context);

    for (const item of items) {
      const product = await em.findOne(Product, { id: item.id });

      if (product) {
        product.sortOrder = item.sortOrder;
      }
    }

    await em.flush();
  }

  public async setFeatured(productIds: readonly string[], context: TransactionContext): Promise<void> {
    const em = getMikroOrmEntityManager(context);
    const currentFeatured = await em.find(Product, { isFeatured: true });

    for (const product of currentFeatured) {
      product.isFeatured = false;
      product.featuredOrder = 0;
    }

    for (const [featuredOrder, productId] of productIds.entries()) {
      const product = await em.findOne(Product, { id: productId });

      if (product) {
        product.isFeatured = true;
        product.featuredOrder = featuredOrder;
      }
    }

    await em.flush();
  }

  public async softDelete(id: string, context: TransactionContext): Promise<boolean> {
    const em = getMikroOrmEntityManager(context);
    const product = await em.findOne(Product, { id });

    if (!product) {
      return false;
    }

    product.isArchived = true;
    product.isFeatured = false;
    await em.flush();

    return true;
  }

  public async toggleActive(
    id: string,
    context: TransactionContext,
  ): Promise<AdminProductActiveState | null> {
    const em = getMikroOrmEntityManager(context);
    const product = await em.findOne(Product, { id });

    if (!product) {
      return null;
    }

    const isActive = !product.isActive;
    product.isActive = isActive;
    await em.flush();

    return { id: product.id, isActive };
  }

  public async update(
    id: string,
    data: UpdateAdminProductData,
    context: TransactionContext,
  ): Promise<UpdateAdminProductOutcome> {
    const em = getMikroOrmEntityManager(context);
    const product = await em.findOne(Product, { id }, { populate: ['category'] });

    if (!product) {
      return { status: 'product-not-found' };
    }

    if (data.categoryId) {
      const category = await em.findOne(Category, { id: data.categoryId });

      if (!category) {
        return { status: 'category-not-found', categoryId: data.categoryId };
      }

      product.category = category;
    }

    if (data.name !== undefined) {
      product.name = data.name;
    }

    if (data.description !== undefined) {
      product.description = data.description;
    }

    if (data.price !== undefined) {
      product.price = data.price.toFixed(2);
    }

    if (data.imageUrl !== undefined) {
      product.imageUrl = data.imageUrl;
    }

    if (data.isActive !== undefined) {
      product.isActive = data.isActive;
    }

    if (data.isSoldOut !== undefined) {
      product.isSoldOut = data.isSoldOut;
    }

    if (data.isPromotional !== undefined) {
      product.isPromotional = data.isPromotional;
    }

    if (data.promotionalPrice !== undefined) {
      product.promotionalPrice =
        data.promotionalPrice !== null ? data.promotionalPrice.toFixed(2) : undefined;
    }

    if (data.promotionStartDate !== undefined) {
      product.promotionStartDate = data.promotionStartDate
        ? new Date(data.promotionStartDate)
        : undefined;
    }

    if (data.promotionEndDate !== undefined) {
      product.promotionEndDate = data.promotionEndDate
        ? new Date(data.promotionEndDate)
        : undefined;
    }

    if (data.isCompound !== undefined) {
      product.isCompound = data.isCompound;
    }

    if (data.isRedeemable !== undefined) {
      product.isRedeemable = data.isRedeemable;
    }

    if (data.redemptionCost !== undefined) {
      product.redemptionCost = data.redemptionCost;
    }

    if (data.isPromotional === false) {
      product.promotionalPrice = undefined;
      product.promotionStartDate = undefined;
      product.promotionEndDate = undefined;
    }

    await em.flush();

    return { status: 'updated', product: this.toMutationModel(product) };
  }

  private toMutationModel(product: Product): AdminProductMutationModel {
    return {
      id: product.id,
      category: {
        id: product.category.id,
        name: product.category.name,
      },
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      sortOrder: product.sortOrder ?? 0,
      isActive: product.isActive ?? true,
      isSoldOut: product.isSoldOut ?? false,
      isFeatured: product.isFeatured ?? false,
      featuredOrder: product.featuredOrder ?? 0,
      isPromotional: product.isPromotional ?? false,
      promotionalPrice: product.promotionalPrice,
      promotionStartDate: product.promotionStartDate,
      promotionEndDate: product.promotionEndDate,
      isCompound: product.isCompound ?? false,
      isRedeemable: product.isRedeemable ?? false,
      redemptionCost: product.redemptionCost ?? 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
