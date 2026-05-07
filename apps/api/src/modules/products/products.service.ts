import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Category, Product } from '../../entities';
import { isPromotionActive, getEffectivePrice } from '../../utils/product-price';
import { StoreService } from '../store/store.service';
import {
  getCombinedScheduleAvailability,
  normalizeWeeklySchedule,
  type ScheduleAvailability,
  type WeeklySchedule,
} from '@cardapio/shared';

@Injectable()
export class ProductsService {
  constructor(
    private readonly em: EntityManager,
    private readonly storeService: StoreService,
  ) {}

  async getProductsByIds(ids: string[], scheduledFor?: string) {
    const context = await this.getAvailabilityContext(scheduledFor);
    const products = await this.em.find(
      Product,
      { id: { $in: ids } },
      { populate: ['extras', 'category', 'optionGroups', 'optionGroups.options'] },
    );

    return products.map((p) => this.formatProduct(p, this.getProductAvailability(p, p.category, context)));
  }

  async getFeatured(scheduledFor?: string) {
    const context = await this.getAvailabilityContext(scheduledFor);
    const products = await this.em.find(
      Product,
      { isFeatured: true, isActive: true },
      { populate: ['extras', 'category', 'optionGroups', 'optionGroups.options'], orderBy: { featuredOrder: 'ASC' } },
    );

    return products.map((p) => this.formatProduct(p, this.getProductAvailability(p, p.category, context)));
  }

  async getMenu(scheduledFor?: string) {
    const context = await this.getAvailabilityContext(scheduledFor);
    const categories = await this.em.find(
      Category,
      { isActive: true },
      {
        populate: ['products', 'products.extras', 'products.optionGroups', 'products.optionGroups.options'],
        orderBy: { sortOrder: 'ASC', products: { sortOrder: 'ASC', name: 'ASC' } },
      },
    );

    return categories.map((cat) => {
      const categoryAvailability = this.getCategoryAvailability(cat, context);
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        imageUrl: cat.imageUrl,
        availabilitySchedule: cat.availabilitySchedule ?? null,
        isAvailable: categoryAvailability.available,
        availabilityMessage: categoryAvailability.nextAvailableLabel,
        nextAvailableAt: categoryAvailability.nextAvailableAt,
        products: cat.products.getItems().map((p) => this.formatProduct(p, this.getProductAvailability(p, cat, context))),
      };
    });
  }

  private async getAvailabilityContext(scheduledFor?: string) {
    const settings = await this.storeService.getSettings();
    const at = parseScheduledFor(scheduledFor) ?? new Date();
    const storeSchedule = this.storeService.getEffectiveSchedule(settings);
    const useForcedStoreOpen = !!settings.forceOpen && !scheduledFor;

    return {
      at,
      forceClose: !!settings.forceClose,
      storeSchedule,
      useForcedStoreOpen,
    };
  }

  private getCategoryAvailability(
    category: Category,
    context: { at: Date; forceClose: boolean; storeSchedule: WeeklySchedule; useForcedStoreOpen: boolean },
  ): ScheduleAvailability {
    if (context.forceClose) {
      return { available: false };
    }

    const rules = [
      ...(context.useForcedStoreOpen ? [] : [{ schedule: context.storeSchedule, defaultAvailable: false }]),
      { schedule: normalizeWeeklySchedule(category.availabilitySchedule), defaultAvailable: true },
    ];

    return getCombinedScheduleAvailability(rules, context.at);
  }

  private getProductAvailability(
    product: Product,
    category: Category,
    context: { at: Date; forceClose: boolean; storeSchedule: WeeklySchedule; useForcedStoreOpen: boolean },
  ): ScheduleAvailability {
    if (!(product.isActive ?? true)) {
      return { available: false };
    }
    return this.getCategoryAvailability(category, context);
  }

  private formatProduct(p: Product, availability?: ScheduleAvailability) {
    const promotionActive = isPromotionActive(p);
    const isCompound = p.isCompound ?? false;
    const active = p.isActive ?? true;
    const available = active && (availability?.available ?? true);

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: parseFloat(p.price),
      imageUrl: p.imageUrl,
      isActive: active,
      isAvailable: available,
      availabilityMessage: active ? availability?.nextAvailableLabel : 'Esgotado',
      nextAvailableAt: availability?.nextAvailableAt,
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
          imageUrl: e.imageUrl,
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
                  imageUrl: o.imageUrl,
                })),
            }))
        : undefined,
    };
  }
}

function parseScheduledFor(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Horário agendado inválido');
  }
  return date;
}
