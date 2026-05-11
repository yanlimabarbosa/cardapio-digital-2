import { EntityManager } from '@mikro-orm/postgresql';
import { Section, SectionProduct } from '../../../../entities';
import type { AdminSectionReadRepository } from '../../application/ports/admin-section.read-repository.port';
import type {
  AdminSectionProductReadModel,
  AdminSectionReadModel,
} from '../../application/read-models/admin-section.read-model';

export class MikroOrmAdminSectionReadRepository implements AdminSectionReadRepository {
  public constructor(private readonly em: EntityManager) {}

  public async list(): Promise<readonly AdminSectionReadModel[]> {
    const sections = await this.em.find(
      Section,
      {},
      { populate: ['products.product'], orderBy: { sortOrder: 'ASC' } },
    );

    return sections.map((section: Section): AdminSectionReadModel => this.toReadModel(section));
  }

  private toReadModel(section: Section): AdminSectionReadModel {
    const sectionProducts = section.products.getItems();

    return {
      id: section.id,
      label: section.label,
      emoji: section.emoji,
      sortOrder: section.sortOrder ?? 0,
      isActive: section.isActive ?? true,
      availabilitySchedule: section.availabilitySchedule ?? null,
      productCount: section.products.length,
      products: sectionProducts
        .slice()
        .sort(this.compareSectionProducts)
        .map((sectionProduct: SectionProduct): AdminSectionProductReadModel =>
          this.toProductReadModel(sectionProduct),
        ),
    };
  }

  private toProductReadModel(sectionProduct: SectionProduct): AdminSectionProductReadModel {
    return {
      id: sectionProduct.product.id,
      name: sectionProduct.product.name,
      price: Number.parseFloat(sectionProduct.product.price),
      imageUrl: sectionProduct.product.imageUrl,
    };
  }

  private compareSectionProducts(left: SectionProduct, right: SectionProduct): number {
    return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  }
}
