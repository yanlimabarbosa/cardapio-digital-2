import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { SectionProduct } from './section-product.entity';

@Entity({ tableName: 'sections' })
export class Section {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  label!: string;

  @Property({ default: '' })
  emoji?: string = '';

  @Property({ default: 0 })
  sortOrder?: number = 0;

  @Property({ default: true })
  isActive?: boolean = true;

  @OneToMany(() => SectionProduct, (sp) => sp.section, { eager: true })
  products = new Collection<SectionProduct>(this);

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();
}
