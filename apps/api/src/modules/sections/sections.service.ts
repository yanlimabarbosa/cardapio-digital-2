import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Section, SectionProduct, Product } from '../../entities';

@Injectable()
export class SectionsService {
  constructor(private readonly em: EntityManager) {}

  async listPublic() {
    const em = this.em.fork();
    const sections = await em.find(
      Section,
      { isActive: true },
      { populate: ['products.product.extras'], orderBy: { sortOrder: 'ASC' } },
    );

    return sections.map((s) => ({
      id: s.id,
      label: s.label,
      emoji: s.emoji,
      products: s.products
        .getItems()
        .filter((sp) => sp.product.isActive)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((sp) => ({
          id: sp.product.id,
          name: sp.product.name,
          description: sp.product.description,
          price: parseFloat(sp.product.price),
          imageUrl: sp.product.imageUrl,
          isActive: true,
          extras: sp.product.extras.getItems()
            .filter((e) => e.isActive)
            .map((e) => ({ id: e.id, name: e.name, price: parseFloat(e.price), imageUrl: e.imageUrl })),
        })),
    }));
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

  async create(dto: { label: string; emoji?: string }) {
    const em = this.em.fork();
    const maxOrder = await em.count(Section, {});
    const section = em.create(Section, {
      label: dto.label,
      emoji: dto.emoji || '',
      sortOrder: maxOrder,
    });
    await em.flush();
    return { id: section.id, label: section.label, emoji: section.emoji, sortOrder: section.sortOrder, isActive: section.isActive, productCount: 0, products: [] };
  }

  async update(id: string, dto: { label?: string; emoji?: string; isActive?: boolean }) {
    const em = this.em.fork();
    const section = await em.findOne(Section, { id });
    if (!section) throw new NotFoundException('Seção não encontrada');

    if (dto.label !== undefined) section.label = dto.label;
    if (dto.emoji !== undefined) section.emoji = dto.emoji;
    if (dto.isActive !== undefined) section.isActive = dto.isActive;

    await em.flush();
    return { id: section.id, label: section.label, emoji: section.emoji, sortOrder: section.sortOrder, isActive: section.isActive };
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
}
