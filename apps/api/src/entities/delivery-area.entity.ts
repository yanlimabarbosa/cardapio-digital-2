import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'delivery_areas' })
@Unique({ properties: ['normalizedKey'] })
export class DeliveryArea {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  neighborhood!: string;

  @Property()
  city!: string;

  @Property({ columnType: 'decimal(10,2)' })
  fee!: string;

  @Property({ unique: true })
  normalizedKey!: string;

  @Property({ default: true })
  isActive?: boolean = true;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();
}
