import { Entity, PrimaryKey, Property, Enum, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import { Customer } from './customer.entity';
import { Coupon } from './coupon.entity';
import { OrderItem } from './order-item.entity';
import { DeliveryDriver } from './delivery-driver.entity';

@Entity({ tableName: 'orders' })
export class Order {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  orderNumber!: number;

  @ManyToOne(() => Customer)
  customer!: Customer;

  @Property()
  customerName!: string;

  @Property()
  customerPhone!: string;

  @Property({ nullable: true })
  customerEmail?: string;

  @Enum(() => OrderStatus)
  status?: OrderStatus = OrderStatus.PENDING_PAYMENT;

  @Property({ columnType: 'decimal(10,2)' })
  totalAmount!: string;

  @Enum(() => PaymentMethod)
  paymentMethod!: PaymentMethod;

  @Property({ nullable: true })
  paymentId?: string;

  @Enum({ items: () => PaymentStatus, nullable: true })
  paymentStatus?: PaymentStatus;

  @Property({ default: 'pickup' })
  deliveryType?: string = 'pickup'; // 'pickup' | 'delivery'

  @Property({ nullable: true, type: 'jsonb' })
  deliveryAddress?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };

  @Property({ nullable: true, columnType: 'decimal(10,2)' })
  deliveryFee?: string;

  @ManyToOne(() => DeliveryDriver, { nullable: true })
  driver?: DeliveryDriver;

  @Property({ nullable: true })
  driverName?: string;

  @ManyToOne(() => Coupon, { nullable: true })
  coupon?: Coupon;

  @Property({ nullable: true, length: 50 })
  couponCode?: string;

  @Property({ nullable: true, columnType: 'decimal(10,2)' })
  discountAmount?: string;

  @Property({ default: 0 })
  pointsEarned?: number = 0;

  @Property({ default: 0 })
  pointsSpent?: number = 0;

  @Property({ nullable: true, columnType: 'text' })
  notes?: string;

  @Property({ nullable: true })
  scheduledFor?: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { eager: true })
  items = new Collection<OrderItem>(this);

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
