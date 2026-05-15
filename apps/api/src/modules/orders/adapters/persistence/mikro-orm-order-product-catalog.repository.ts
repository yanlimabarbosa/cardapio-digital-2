import { EntityManager } from '@mikro-orm/postgresql';
import { Product } from '../../../../entities';
import { getMikroOrmEntityManager } from '../../../../shared/infrastructure/mikro-orm/mikro-orm-unit-of-work';
import type {
  FindOrderableProductsQuery,
  OrderableProductModel,
  OrderProductCatalogRepository,
} from '../../application/ports/order-product-catalog.port';

export class MikroOrmOrderProductCatalogRepository implements OrderProductCatalogRepository {
  public constructor(private readonly em: EntityManager) {}

  public async findOrderableProducts(
    query: FindOrderableProductsQuery,
  ): Promise<readonly OrderableProductModel[]> {
    const em = query.context ? getMikroOrmEntityManager(query.context) : this.em;
    const ids = [...new Set(query.ids)];
    if (ids.length === 0) {
      return [];
    }

    if (query.includeComposition) {
      const products = await em.find(
        Product,
        { id: { $in: ids } },
        { populate: ['category', 'extras', 'optionGroups', 'optionGroups.options'] },
      );

      return products.map((product) => this.toOrderableProduct(product, true));
    }

    const products = await em.find(
      Product,
      { id: { $in: ids } },
      { populate: ['category'] },
    );

    return products.map((product) => this.toOrderableProduct(product, false));
  }

  private toOrderableProduct(product: Product, includeComposition: boolean): OrderableProductModel {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      isActive: (product.isActive ?? true) && !(product.isArchived ?? false) && !(product.isSoldOut ?? false),
      isCompound: product.isCompound,
      isPromotional: product.isPromotional,
      isRedeemable: product.isRedeemable,
      promotionalPrice: product.promotionalPrice,
      promotionStartDate: product.promotionStartDate,
      promotionEndDate: product.promotionEndDate,
      redemptionCost: product.redemptionCost,
      category: {
        availabilitySchedule: product.category.availabilitySchedule,
      },
      extras: includeComposition
        ? product.extras.getItems().map((extra) => ({
          id: extra.id,
          name: extra.name,
          price: extra.price,
          isActive: (extra.isActive ?? true) && !(extra.isArchived ?? false) && !(extra.isSoldOut ?? false),
        }))
        : [],
      optionGroups: includeComposition
        ? product.optionGroups.getItems().map((group) => ({
          id: group.id,
          name: group.name,
          minSelections: group.minSelections,
          maxSelections: group.maxSelections,
          isActive: (group.isActive ?? true) && !(group.isArchived ?? false),
          options: group.options.getItems().map((option) => ({
            id: option.id,
            name: option.name,
            price: option.price,
            isActive: (option.isActive ?? true) && !(option.isArchived ?? false) && !(option.isSoldOut ?? false),
          })),
        }))
        : [],
    };
  }
}
