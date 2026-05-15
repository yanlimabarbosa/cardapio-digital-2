import { BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Section, Product } from '../../../../entities';
import type { StoreSettingsRepository } from '../../../store/application/ports/store-settings.repository.port';
import { StoreSchedule } from '../../../store/domain/store-schedule.value-object';
import { MenuAvailabilityPolicy, type MenuAvailabilityContext } from '../../domain/menu-availability.policy';
import { ProductPricePolicy } from '../../../../shared/domain/product-price.policy';
import type { MenuAvailabilityQuery } from '../../application/ports/menu-read-repository.port';
import type { SectionReadRepository } from '../../application/ports/section-read-repository.port';
import type {
  SectionProductReadModel,
  SectionReadModel,
} from '../../application/read-models/section.read-model';
import type { ProductExtraReadModel } from '../../application/read-models/product.read-model';

export class MikroOrmSectionReadRepository implements SectionReadRepository {
  public constructor(
    private readonly em: EntityManager,
    private readonly storeSettings: StoreSettingsRepository,
  ) {}

  public async getPublicSections(query: MenuAvailabilityQuery): Promise<readonly SectionReadModel[]> {
    const em = this.em.fork();
    const context = await this.getAvailabilityContext(query.scheduledFor);
    const sections = await em.find(
      Section,
      { isActive: true },
      { populate: ['products.product.extras', 'products.product.category'], orderBy: { sortOrder: 'ASC' } },
    );

    return sections.map((section) => this.toSectionReadModel(section, context));
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

  private toSectionReadModel(section: Section, context: MenuAvailabilityContext): SectionReadModel {
    const availability = MenuAvailabilityPolicy.create(context).sectionAvailability(section);

    return {
      id: section.id,
      label: section.label,
      emoji: section.emoji,
      availabilitySchedule: section.availabilitySchedule ?? null,
      isAvailable: availability.available,
      availabilityMessage: availability.nextAvailableLabel,
      nextAvailableAt: availability.nextAvailableAt,
      products: section.products
        .getItems()
        .filter((sectionProduct) => this.isPublicProduct(sectionProduct.product))
        .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
        .map((sectionProduct) => this.toSectionProductReadModel(sectionProduct.product, section, context)),
    };
  }

  private toSectionProductReadModel(
    product: Product,
    section: Section,
    context: MenuAvailabilityContext,
  ): SectionProductReadModel {
    const soldOut = product.isSoldOut ?? false;
    const availability = MenuAvailabilityPolicy.create(context).productInSectionAvailability({
      isActive: (product.isActive ?? true) && !(product.isArchived ?? false) && !soldOut,
      categoryAvailabilitySchedule: product.category.availabilitySchedule,
      sectionAvailabilitySchedule: section.availabilitySchedule,
    });
    const pricePolicy = ProductPricePolicy.create(product);
    const priceEvaluationDate = new Date();
    const promotionActive = pricePolicy.isPromotionActive(priceEvaluationDate);

    const available = !soldOut && availability.available;

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      imageUrl: product.imageUrl,
      isActive: true,
      isAvailable: available,
      availabilityMessage: soldOut ? 'Esgotado' : availability.nextAvailableLabel,
      nextAvailableAt: soldOut ? undefined : availability.nextAvailableAt,
      isCompound: product.isCompound ?? false,
      isPromotional: product.isPromotional ?? false,
      promotionalPrice: product.promotionalPrice ? parseFloat(product.promotionalPrice) : null,
      promotionActive,
      effectivePrice: parseFloat(pricePolicy.effectivePrice(priceEvaluationDate)),
      extras: this.toExtras(product),
    };
  }

  private toExtras(product: Product): readonly ProductExtraReadModel[] {
    return product.extras
      .getItems()
      .filter((extra) => (extra.isActive ?? true) && !(extra.isArchived ?? false) && !(extra.isSoldOut ?? false))
      .map((extra) => ({
        id: extra.id,
        name: extra.name,
        price: parseFloat(extra.price),
        imageUrl: extra.imageUrl,
      }));
  }

  private isPublicProduct(product: Product): boolean {
    return (product.isActive ?? true) && !(product.isArchived ?? false);
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
