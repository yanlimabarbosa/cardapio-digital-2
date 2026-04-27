import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Order } from './order.entity';

@Entity({ tableName: 'order_items' })
export class OrderItem {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Order)
  order!: Order;

  @Property({ type: 'uuid' })
  productId!: string;

  @Property()
  productName!: string;

  @Property({ columnType: 'decimal(10,2)' })
  unitPrice!: string;

  @Property()
  quantity!: number;

  @Property({ columnType: 'decimal(10,2)' })
  subtotal!: string;

  @Property({ type: 'jsonb', nullable: true })
  extras?: Array<{ name: string; price: number }>;

  @Property({ type: 'jsonb', nullable: true })
  groupedExtras?: Array<{ groupName: string; groupId: string; options: Array<{ name: string; price: number }> }>;

  @Property({ default: false })
  isRedeemed?: boolean = false;

  @Property({ default: 0 })
  pointsSpent?: number = 0;
}
