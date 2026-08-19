import { BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { type ScheduleAvailability } from '@cardapio/shared';
import { Category, Product } from '../../../../entities';
import type { StoreSettingsRepository } from '../../../store/application/ports/store-settings.repository.port';
import { StoreSchedule } from '../../../store/domain/store-schedule.value-object';
import { MenuAvailabilityPolicy, type MenuAvailabilityContext } from '../../domain/menu-availability.policy';
import { ProductPricePolicy } from '../../../../shared/domain/product-price.policy';
import type {
  MenuAvailabilityQuery,
  MenuReadRepository,
  ProductLookupQuery,
} from '../../application/ports/menu-read-repository.port';
import type { MenuReadModel } from '../../application/read-models/menu.read-model';
import type {
  ProductExtraReadModel,
  ProductOptionGroupReadModel,
  ProductReadModel,
} from '../../application/read-models/product.read-model';

export class MikroOrmMenuReadRepository implements MenuReadRepository {
  public constructor(
    private readonly em: EntityManager,
    private readonly storeSettings: StoreSettingsRepository,
  ) {}

  public async getMenu(query: MenuAvailabilityQuery): Promise<readonly MenuReadModel[]> {
    const context = await this.getAvailabilityContext(query.scheduledFor);
    const categories = await this.em.find(
      Category,
      { isActive: true, isArchived: false },
      {
        populate: [
          'products',
          'products.extras',
          'products.optionGroups',
          'products.optionGroups.options',
          'products.optionGroups.combinedLimit',
          'products.combinedLimits',
        ],
        orderBy: { sortOrder: 'ASC', products: { sortOrder: 'ASC', name: 'ASC' } },
      },
    );

    return categories.map((category) => this.toMenuReadModel(category, context));
  }

  public async getFeaturedProducts(query: MenuAvailabilityQuery): Promise<readonly ProductReadModel[]> {
    const context = await this.getAvailabilityContext(query.scheduledFor);
    const products = await this.em.find(
      Product,
      { isFeatured: true, isActive: true, isArchived: false },
      {
        populate: [
          'extras',
          'category',
          'optionGroups',
          'optionGroups.options',
          'optionGroups.combinedLimit',
          'combinedLimits',
        ],
        orderBy: { featuredOrder: 'ASC' },
      },
    );

    return products.map((product) => this.toProductReadModel(product, product.category, context));
  }

  public async getProductsByIds(query: ProductLookupQuery): Promise<readonly ProductReadModel[]> {
    if (query.ids.length === 0) {
      return [];
    }

    const context = await this.getAvailabilityContext(query.scheduledFor);
    const products = await this.em.find(
      Product,
      { id: { $in: [...query.ids] } },
      {
        populate: [
          'extras',
          'category',
          'optionGroups',
          'optionGroups.options',
          'optionGroups.combinedLimit',
          'combinedLimits',
        ],
      },
    );

    return products.map((product) => this.toProductReadModel(product, product.category, context));
  }

  private async getAvailabilityContext(scheduledFor?: string): Promise<MenuAvailabilityContext> {
    const settings = await this.storeSettings.get();
    const at = this.parseScheduledFor(scheduledFor) ?? new Date();

    return {
      at,
      forceClose: settings.forceClose,
      storeSchedule: StoreSchedule.fromSettings(settings).toWeeklySchedule(),
      useForcedStoreOpen: settings.forceOpen && !scheduledFor,
    };
  }

  private toMenuReadModel(category: Category, context: MenuAvailabilityContext): MenuReadModel {
    const availability = MenuAvailabilityPolicy.create(context).categoryAvailability(category);

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      availabilitySchedule: category.availabilitySchedule ?? null,
      isAvailable: availability.available,
      availabilityMessage: availability.nextAvailableLabel,
      nextAvailableAt: availability.nextAvailableAt,
      products: category.products
        .getItems()
        .filter((product) => this.isPublicProduct(product))
        .map((product) => this.toProductReadModel(product, category, context)),
    };
  }

  private toProductReadModel(
    product: Product,
    category: Category,
    context: MenuAvailabilityContext,
  ): ProductReadModel {
    const active = (product.isActive ?? true) && !(product.isArchived ?? false);
    const soldOut = product.isSoldOut ?? false;
    const availability = MenuAvailabilityPolicy.create(context).productInCategoryAvailability({
      isActive: active && !soldOut,
      categoryAvailabilitySchedule: category.availabilitySchedule,
    });
    const pricePolicy = ProductPricePolicy.create(product);
    const priceEvaluationDate = new Date();
    const promotionActive = pricePolicy.isPromotionActive(priceEvaluationDate);
    const isCompound = product.isCompound ?? false;
    const available = active && !soldOut && availability.available;

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      imageUrl: product.imageUrl,
      isActive: active,
      isAvailable: available,
      availabilityMessage: soldOut ? 'Esgotado' : active ? availability.nextAvailableLabel : 'Indisponível',
      nextAvailableAt: soldOut ? undefined : availability.nextAvailableAt,
      isCompound,
      isPromotional: product.isPromotional ?? false,
      promotionalPrice: product.promotionalPrice ? parseFloat(product.promotionalPrice) : null,
      promotionActive,
      effectivePrice: parseFloat(pricePolicy.effectivePrice(priceEvaluationDate)),
      extras: this.toExtras(product),
      optionGroups: isCompound ? this.toOptionGroups(product) : undefined,
      combinedLimits: isCompound ? this.toCombinedLimits(product) : undefined,
    };
  }

  private toExtras(product: Product): readonly ProductExtraReadModel[] {
    return product.extras
      .getItems()
      .filter((extra) => this.isPublicExtra(extra) && !extra.optionGroup)
      .map((extra) => ({
        id: extra.id,
        name: extra.name,
        price: parseFloat(extra.price),
        imageUrl: extra.imageUrl,
      }));
  }

  private toOptionGroups(product: Product): readonly ProductOptionGroupReadModel[] {
    return product.optionGroups
      .getItems()
      .filter((group) => (group.isActive ?? true) && !(group.isArchived ?? false))
      .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
      .map((group) => ({
        id: group.id,
        name: group.name,
        minSelections: group.minSelections ?? 0,
        maxSelections: group.maxSelections ?? 1,
        required: (group.minSelections ?? 0) >= 1,
        sortOrder: group.sortOrder ?? 0,
        combinedLimitId: group.combinedLimit?.id,
        options: group.options
          .getItems()
          .filter((option) => this.isPublicExtra(option))
          .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
          .map((option) => ({
            id: option.id,
            name: option.name,
            price: parseFloat(option.price),
            imageUrl: option.imageUrl,
          })),
      }));
  }

  private toCombinedLimits(
    product: Product,
  ): readonly { id: string; name: string; maxSelections: number }[] {
    return product.combinedLimits
      .getItems()
      .filter((limit) => !(limit.isArchived ?? false))
      .map((limit) => ({
        id: limit.id,
        name: limit.name,
        maxSelections: limit.maxSelections ?? 1,
      }));
  }

  private isPublicProduct(product: Product): boolean {
    return (product.isActive ?? true) && !(product.isArchived ?? false);
  }

  private isPublicExtra(extra: { isActive?: boolean; isArchived?: boolean; isSoldOut?: boolean }): boolean {
    return (extra.isActive ?? true) && !(extra.isArchived ?? false) && !(extra.isSoldOut ?? false);
  }

  private parseScheduledFor(value?: string): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Horário agendado inválido');
    }

    return date;
  }
}
