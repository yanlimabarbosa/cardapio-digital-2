import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { Product } from './product.entity';
import { ProductExtra } from './product-extra.entity';

@Entity({ tableName: 'option_groups' })
export class OptionGroup {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Product)
  product!: Product;

  @Property()
  name!: string;

  @Property({ default: 0 })
  minSelections?: number = 0;

  @Property({ default: 1 })
  maxSelections?: number = 1;

  @Property({ default: 0 })
  sortOrder?: number = 0;

  @Property({ default: true })
  isActive?: boolean = true;

  @OneToMany(() => ProductExtra, (extra) => extra.optionGroup)
  options = new Collection<ProductExtra>(this);

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
