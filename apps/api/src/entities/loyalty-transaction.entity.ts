import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Customer } from './customer.entity';
import { Order } from './order.entity';

@Entity({ tableName: 'loyalty_transactions' })
export class LoyaltyTransaction {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Customer)
  customer!: Customer;

  @ManyToOne(() => Order, { nullable: true })
  order?: Order;

  @Property()
  points!: number;

  @Property({ length: 20 })
  type!: string; // 'earn' | 'redeem' | 'adjustment'

  @Property({ nullable: true, columnType: 'text' })
  description?: string;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();
}
