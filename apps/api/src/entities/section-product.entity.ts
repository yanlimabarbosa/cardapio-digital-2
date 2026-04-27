import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Section } from './section.entity';
import { Product } from './product.entity';

@Entity({ tableName: 'section_products' })
export class SectionProduct {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Section, { deleteRule: 'cascade' })
  section!: Section;

  @ManyToOne(() => Product, { eager: true })
  product!: Product;

  @Property({ default: 0 })
  sortOrder?: number = 0;
}
