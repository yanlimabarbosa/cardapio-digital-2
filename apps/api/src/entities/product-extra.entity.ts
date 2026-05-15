import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Product } from './product.entity';
import { OptionGroup } from './option-group.entity';

@Entity({ tableName: 'product_extras' })
export class ProductExtra {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Product)
  product!: Product;

  @ManyToOne(() => OptionGroup, { nullable: true })
  optionGroup?: OptionGroup;

  @Property()
  name!: string;

  @Property({ columnType: 'decimal(10,2)' })
  price!: string;

  @Property({ nullable: true, columnType: 'varchar' })
  imageUrl?: string;

  @Property({ default: 0 })
  sortOrder?: number = 0;

  @Property({ default: true })
  isActive?: boolean = true;

  @Property({ default: false })
  isSoldOut?: boolean = false;

  @Property({ default: false })
  isArchived?: boolean = false;
}
