import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { Product } from './product.entity';
import { OptionGroup } from './option-group.entity';

@Entity({ tableName: 'combined_limits' })
export class CombinedLimit {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Product)
  product!: Product;

  @Property()
  name!: string;

  @Property({ default: 1 })
  maxSelections?: number = 1;

  @Property({ default: false })
  isArchived?: boolean = false;

  @OneToMany(() => OptionGroup, (group) => group.combinedLimit)
  groups = new Collection<OptionGroup>(this);

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
