import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { Category } from './category.entity';
import { ProductExtra } from './product-extra.entity';
import { OptionGroup } from './option-group.entity';
import { CombinedLimit } from './combined-limit.entity';

@Entity({ tableName: 'products' })
export class Product {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Category)
  category!: Category;

  @Property()
  name!: string;

  @Property({ nullable: true })
  description?: string;

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

  @Property({ default: false })
  isFeatured?: boolean = false;

  @Property({ default: 0 })
  featuredOrder?: number = 0;

  // Promotional fields (Feature 4)
  @Property({ default: false })
  isPromotional?: boolean = false;

  @Property({ nullable: true, columnType: 'decimal(10,2)' })
  promotionalPrice?: string;

  @Property({ nullable: true })
  promotionStartDate?: Date;

  @Property({ nullable: true })
  promotionEndDate?: Date;

  // Compound product (option groups)
  @Property({ default: false })
  isCompound?: boolean = false;

  // Loyalty fields (Feature 2)
  @Property({ default: false })
  isRedeemable?: boolean = false;

  @Property({ default: 0 })
  redemptionCost?: number = 0;

  @OneToMany(() => ProductExtra, (extra) => extra.product)
  extras = new Collection<ProductExtra>(this);

  @OneToMany(() => OptionGroup, (og) => og.product)
  optionGroups = new Collection<OptionGroup>(this);

  @OneToMany(() => CombinedLimit, (limit) => limit.product)
  combinedLimits = new Collection<CombinedLimit>(this);

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
