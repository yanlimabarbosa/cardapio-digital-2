import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'admin_users' })
export class AdminUser {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  passwordHash!: string;

  @Property()
  name!: string;

  @Property({ nullable: true, unique: true, length: 20 })
  phone?: string;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
