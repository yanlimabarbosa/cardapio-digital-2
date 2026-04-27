import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Category, Product } from '../../entities';
import { isPromotionActive, getEffectivePrice } from '../../utils/product-price';

@Injectable()
export class ProductsService {
  constructor(private readonly em: EntityManager) {}

  async getProductsByIds(ids: string[]) {
    const products = await this.em.find(
      Product,
      { id: { $in: ids } },
      { populate: ['extras', 'optionGroups', 'optionGroups.options'] },
    );

    return products.map((p) => this.formatProduct(p));
  }

  async getFeatured() {
    const products = await this.em.find(
      Product,
      { isFeatured: true, isActive: true },
      { populate: ['extras', 'category', 'optionGroups', 'optionGroups.options'], orderBy: { featuredOrder: 'ASC' } },
    );

    return products.map((p) => this.formatProduct(p));
  }

  async getMenu() {
    const categories = await this.em.find(
      Category,
      { isActive: true },
      {
        populate: ['products', 'products.extras', 'products.optionGroups', 'products.optionGroups.options'],
        orderBy: { sortOrder: 'ASC', products: { sortOrder: 'ASC', name: 'ASC' } },
      },
    );

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      imageUrl: cat.imageUrl,
      products: cat.products.getItems().map((p) => this.formatProduct(p)),
    }));
  }

  private formatProduct(p: Product) {
    const promotionActive = isPromotionActive(p);
    const isCompound = p.isCompound ?? false;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: parseFloat(p.price),
      imageUrl: p.imageUrl,
      isActive: p.isActive ?? true,
      isCompound,
      isPromotional: p.isPromotional ?? false,
      promotionalPrice: p.promotionalPrice ? parseFloat(p.promotionalPrice) : null,
      promotionActive,
      effectivePrice: parseFloat(getEffectivePrice(p)),
      extras: p.extras
        .getItems()
        .filter((e) => e.isActive && !e.optionGroup)
        .map((e) => ({
          id: e.id,
          name: e.name,
          price: parseFloat(e.price),
        })),
      optionGroups: isCompound
        ? p.optionGroups
            .getItems()
            .filter((g) => g.isActive)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((g) => ({
              id: g.id,
              name: g.name,
              minSelections: g.minSelections ?? 0,
              maxSelections: g.maxSelections ?? 1,
              required: (g.minSelections ?? 0) >= 1,
              sortOrder: g.sortOrder ?? 0,
              options: g.options
                .getItems()
                .filter((o) => o.isActive)
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((o) => ({
                  id: o.id,
                  name: o.name,
                  price: parseFloat(o.price),
                })),
            }))
        : undefined,
    };
  }
}
