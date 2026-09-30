import { EntityManager } from '@mikro-orm/postgresql';
import { CombinedLimit, OptionGroup, Product, ProductExtra } from '../../../../entities';
import type { AdminProductReadRepository } from '../../application/ports/admin-product.read-repository.port';
import type { AdminFeaturedProductReadModel } from '../../application/read-models/admin-featured-product.read-model';
import type { AdminOptionGroupReadModel } from '../../application/read-models/admin-option-group.read-model';
import type { AdminProductExtraListReadModel } from '../../application/read-models/admin-product-extra.read-model';
import type {
  AdminProductCombinedLimitReadModel,
  AdminProductExtraReadModel,
  AdminProductOptionGroupReadModel,
  AdminProductReadModel,
} from '../../application/read-models/admin-product.read-model';

export class MikroOrmAdminProductReadRepository implements AdminProductReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async list(): Promise<readonly AdminProductReadModel[]> {
    const products = await this.em.find(
      Product,
      { isArchived: false },
      {
        populate: [
          'category',
          'extras',
          'optionGroups',
          'optionGroups.options',
          'optionGroups.combinedLimit',
          'combinedLimits',
        ],
        orderBy: { category: { sortOrder: 'ASC' }, sortOrder: 'ASC', name: 'ASC' },
      },
    );

    return products.map((product: Product): AdminProductReadModel => this.toReadModel(product));
  }

  public async listOptionGroups(productId: string): Promise<readonly AdminOptionGroupReadModel[] | null> {
    const product = await this.em.findOne(
      Product,
      { id: productId },
      { populate: ['optionGroups', 'optionGroups.options', 'optionGroups.combinedLimit'] },
    );

    if (!product) {
      return null;
    }

    return product.optionGroups
      .getItems()
      .slice()
      .sort(this.compareOptionGroups)
      .filter((group: OptionGroup): boolean => !(group.isArchived ?? false))
      .map((group: OptionGroup): AdminOptionGroupReadModel => this.toOptionGroupReadModel(group));
  }

  public async listExtras(
    productId: string,
  ): Promise<readonly AdminProductExtraListReadModel[] | null> {
    const product = await this.em.findOne(Product, { id: productId }, { populate: ['extras'] });

    if (!product) {
      return null;
    }

    return product.extras
      .getItems()
      .filter((extra: ProductExtra): boolean => !(extra.isArchived ?? false))
      .map((extra: ProductExtra): AdminProductExtraListReadModel => ({
        id: extra.id,
        name: extra.name,
        price: Number.parseFloat(extra.price),
        imageUrl: extra.imageUrl,
        isActive: extra.isActive ?? true,
        isSoldOut: extra.isSoldOut ?? false,
      }));
  }

  public async listFeatured(): Promise<readonly AdminFeaturedProductReadModel[]> {
    const products = await this.em.find(
      Product,
      { isFeatured: true, isArchived: false },
      { populate: ['category'], orderBy: { featuredOrder: 'ASC' } },
    );

    return products.map((product: Product): AdminFeaturedProductReadModel => ({
      id: product.id,
      name: product.name,
      price: Number.parseFloat(product.price),
      imageUrl: product.imageUrl,
      categoryName: product.category.name,
      featuredOrder: product.featuredOrder ?? 0,
    }));
  }

  private toReadModel(product: Product): AdminProductReadModel {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number.parseFloat(product.price),
      imageUrl: product.imageUrl,
      isActive: product.isActive ?? true,
      isSoldOut: product.isSoldOut ?? false,
      isCompound: product.isCompound ?? false,
      categoryId: product.category.id,
      categoryName: product.category.name,
      combinedLimits: product.combinedLimits
        .getItems()
        .filter((limit: CombinedLimit): boolean => !(limit.isArchived ?? false))
        .map((limit: CombinedLimit): AdminProductCombinedLimitReadModel => ({
          id: limit.id,
          name: limit.name,
          maxSelections: limit.maxSelections ?? 1,
        })),
      extras: product.extras
        .getItems()
        .filter((extra: ProductExtra): boolean => !extra.optionGroup && !(extra.isArchived ?? false))
        .map((extra: ProductExtra): AdminProductExtraReadModel => this.toExtraReadModel(extra)),
      optionGroups: product.optionGroups
        .getItems()
        .slice()
        .filter((group: OptionGroup): boolean => !(group.isArchived ?? false))
        .sort(this.compareOptionGroups)
        .map((group: OptionGroup): AdminProductOptionGroupReadModel => this.toOptionGroupReadModel(group)),
      sortOrder: product.sortOrder ?? 0,
      isRedeemable: product.isRedeemable ?? false,
      redemptionCost: product.redemptionCost ?? 0,
      createdAt: product.createdAt,
    };
  }

  private toExtraReadModel(extra: ProductExtra): AdminProductExtraReadModel {
    return {
      id: extra.id,
      name: extra.name,
      price: Number.parseFloat(extra.price),
      imageUrl: extra.imageUrl,
      sortOrder: extra.sortOrder ?? 0,
      isActive: extra.isActive ?? true,
      isSoldOut: extra.isSoldOut ?? false,
    };
  }

  private toOptionGroupReadModel(group: OptionGroup): AdminProductOptionGroupReadModel {
    return {
      id: group.id,
      name: group.name,
      combinedLimitId: group.combinedLimit?.id ?? null,
      allowRepeat: group.allowRepeat ?? false,
      minSelections: group.minSelections ?? 0,
      maxSelections: group.maxSelections ?? 1,
      sortOrder: group.sortOrder ?? 0,
      isActive: group.isActive ?? true,
      options: group.options
        .getItems()
        .slice()
        .filter((option: ProductExtra): boolean => !(option.isArchived ?? false))
        .sort(this.compareExtras)
        .map((option: ProductExtra): AdminProductExtraReadModel => this.toExtraReadModel(option)),
    };
  }

  private compareOptionGroups(left: OptionGroup, right: OptionGroup): number {
    return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  }

  private compareExtras(left: ProductExtra, right: ProductExtra): number {
    return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  }
}
