import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Product } from './product.entity';

@Entity({ tableName: 'categories' })
export class Category {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ nullable: true, columnType: 'varchar' })
  imageUrl?: string;

  @Property({ default: 0 })
  sortOrder?: number = 0;

  @Property({ default: true })
  isActive?: boolean = true;

  @OneToMany(() => Product, (product) => product.category)
  products = new Collection<Product>(this);

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
