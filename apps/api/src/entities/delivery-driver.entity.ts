import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'delivery_drivers' })
export class DeliveryDriver {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  name!: string;

  @Property({ length: 20 })
  phone!: string;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ default: false })
  calculatesFee: boolean = false;

  @Property({ type: 'integer', default: 0 })
  balanceCents: number = 0;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
