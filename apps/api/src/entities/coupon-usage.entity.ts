import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Coupon } from './coupon.entity';
import { Customer } from './customer.entity';
import { Order } from './order.entity';

@Entity({ tableName: 'coupon_usages' })
export class CouponUsage {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Coupon)
  coupon!: Coupon;

  @ManyToOne(() => Customer)
  customer!: Customer;

  @ManyToOne(() => Order)
  order!: Order;

  @Property({ onCreate: () => new Date() })
  usedAt?: Date = new Date();
}
