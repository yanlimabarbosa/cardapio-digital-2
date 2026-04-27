import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'customers' })
export class Customer {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ type: 'uuid', unique: true, defaultRaw: 'gen_random_uuid()' })
  token!: string;

  @Property()
  name!: string;

  @Property({ unique: true, length: 20 })
  phone!: string;

  @Property({ nullable: true })
  email?: string;

  @Property({ nullable: true })
  passwordHash?: string;

  @Property({ default: 0 })
  loyaltyPoints: number = 0;

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
