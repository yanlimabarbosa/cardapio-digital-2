import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Section, SectionProduct, Product } from '../../entities';
import { StoreService } from '../store/store.service';
import { getEffectivePrice, isPromotionActive } from '../../utils/product-price';
import {
  getCombinedScheduleAvailability,
  normalizeWeeklySchedule,
  type ScheduleAvailability,
  type WeeklySchedule,
} from '@cardapio/shared';

@Injectable()
export class SectionsService {
  constructor(
    private readonly em: EntityManager,
    private readonly storeService: StoreService,
  ) {}

  async listPublic(scheduledFor?: string) {
    const em = this.em.fork();
    const context = await this.getAvailabilityContext(scheduledFor);
    const sections = await em.find(
      Section,
      { isActive: true },
      { populate: ['products.product.extras', 'products.product.category'], orderBy: { sortOrder: 'ASC' } },
    );

    return sections.map((s) => {
      const sectionAvailability = this.getSectionAvailability(s, context);
      return {
        id: s.id,
        label: s.label,
        emoji: s.emoji,
        availabilitySchedule: s.availabilitySchedule ?? null,
        isAvailable: sectionAvailability.available,
        availabilityMessage: sectionAvailability.nextAvailableLabel,
        nextAvailableAt: sectionAvailability.nextAvailableAt,
        products: s.products
          .getItems()
          .filter((sp) => sp.product.isActive)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((sp) => {
            const availability = this.getSectionProductAvailability(sp.product, s, context);
            const promotionActive = isPromotionActive(sp.product);
            return {
              id: sp.product.id,
              name: sp.product.name,
              description: sp.product.description,
              price: parseFloat(sp.product.price),
              imageUrl: sp.product.imageUrl,
              isActive: true,
              isAvailable: availability.available,
              availabilityMessage: availability.nextAvailableLabel,
              nextAvailableAt: availability.nextAvailableAt,
              isCompound: sp.product.isCompound ?? false,
              isPromotional: sp.product.isPromotional ?? false,
              promotionalPrice: sp.product.promotionalPrice ? parseFloat(sp.product.promotionalPrice) : null,
              promotionActive,
              effectivePrice: parseFloat(getEffectivePrice(sp.product)),
              extras: sp.product.extras.getItems()
                .filter((e) => e.isActive)
                .map((e) => ({ id: e.id, name: e.name, price: parseFloat(e.price), imageUrl: e.imageUrl })),
            };
          }),
      };
    });
  }

  async listAll() {
    const em = this.em.fork();
    const sections = await em.find(
      Section,
      {},
      { populate: ['products.product'], orderBy: { sortOrder: 'ASC' } },
    );

    return sections.map((s) => ({
      id: s.id,
      label: s.label,
      emoji: s.emoji,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
      availabilitySchedule: s.availabilitySchedule ?? null,
      productCount: s.products.length,
      products: s.products
        .getItems()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((sp) => ({
          id: sp.product.id,
          name: sp.product.name,
          price: parseFloat(sp.product.price),
          imageUrl: sp.product.imageUrl,
        })),
    }));
  }

  async create(dto: { label: string; emoji?: string; availabilitySchedule?: WeeklySchedule | null }) {
    const em = this.em.fork();
    const maxOrder = await em.count(Section, {});
    const section = em.create(Section, {
      label: dto.label,
      emoji: dto.emoji || '',
      sortOrder: maxOrder,
      availabilitySchedule: normalizeWeeklySchedule(dto.availabilitySchedule) ?? null,
    });
    await em.flush();
    return { id: section.id, label: section.label, emoji: section.emoji, sortOrder: section.sortOrder, isActive: section.isActive, availabilitySchedule: section.availabilitySchedule ?? null, productCount: 0, products: [] };
  }

  async update(id: string, dto: { label?: string; emoji?: string; isActive?: boolean; availabilitySchedule?: WeeklySchedule | null }) {
    const em = this.em.fork();
    const section = await em.findOne(Section, { id });
    if (!section) throw new NotFoundException('Seção não encontrada');

    if (dto.label !== undefined) section.label = dto.label;
    if (dto.emoji !== undefined) section.emoji = dto.emoji;
    if (dto.isActive !== undefined) section.isActive = dto.isActive;
    if (dto.availabilitySchedule !== undefined) section.availabilitySchedule = normalizeWeeklySchedule(dto.availabilitySchedule) ?? null;

    await em.flush();
    return { id: section.id, label: section.label, emoji: section.emoji, sortOrder: section.sortOrder, isActive: section.isActive, availabilitySchedule: section.availabilitySchedule ?? null };
  }

  async remove(id: string) {
    const em = this.em.fork();
    const section = await em.findOne(Section, { id });
    if (!section) throw new NotFoundException('Seção não encontrada');
    await em.removeAndFlush(section);
  }

  async reorderSections(ids: string[]) {
    const em = this.em.fork();
    for (let i = 0; i < ids.length; i++) {
      const section = await em.findOne(Section, { id: ids[i] });
      if (section) section.sortOrder = i;
    }
    await em.flush();
  }

  async setProducts(sectionId: string, productIds: string[]) {
    const em = this.em.fork();
    const section = await em.findOne(Section, { id: sectionId }, { populate: ['products'] });
    if (!section) throw new NotFoundException('Seção não encontrada');

    // Remove existing
    for (const sp of section.products.getItems()) {
      em.remove(sp);
    }

    // Add new in order
    for (let i = 0; i < productIds.length; i++) {
      const product = await em.findOne(Product, { id: productIds[i] });
      if (!product) throw new BadRequestException(`Produto ${productIds[i]} não encontrado`);
      em.create(SectionProduct, {
        section,
        product,
        sortOrder: i,
      });
    }

    await em.flush();
  }

  private async getAvailabilityContext(scheduledFor?: string) {
    const settings = await this.storeService.getSettings();
    const at = parseScheduledFor(scheduledFor) ?? new Date();

    return {
      at,
      forceClose: !!settings.forceClose,
      storeSchedule: this.storeService.getEffectiveSchedule(settings),
      useForcedStoreOpen: !!settings.forceOpen && !scheduledFor,
    };
  }

  private getSectionAvailability(
    section: Section,
    context: { at: Date; forceClose: boolean; storeSchedule: WeeklySchedule; useForcedStoreOpen: boolean },
  ): ScheduleAvailability {
    if (context.forceClose) return { available: false };
    return getCombinedScheduleAvailability([
      ...(context.useForcedStoreOpen ? [] : [{ schedule: context.storeSchedule, defaultAvailable: false }]),
      { schedule: normalizeWeeklySchedule(section.availabilitySchedule), defaultAvailable: true },
    ], context.at);
  }

  private getSectionProductAvailability(
    product: Product,
    section: Section,
    context: { at: Date; forceClose: boolean; storeSchedule: WeeklySchedule; useForcedStoreOpen: boolean },
  ): ScheduleAvailability {
    if (context.forceClose || !(product.isActive ?? true)) return { available: false };
    return getCombinedScheduleAvailability([
      ...(context.useForcedStoreOpen ? [] : [{ schedule: context.storeSchedule, defaultAvailable: false }]),
      { schedule: normalizeWeeklySchedule(product.category.availabilitySchedule), defaultAvailable: true },
      { schedule: normalizeWeeklySchedule(section.availabilitySchedule), defaultAvailable: true },
    ], context.at);
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
