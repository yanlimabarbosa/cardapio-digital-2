import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'coupons' })
export class Coupon {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ length: 50, unique: true })
  code!: string;

  @Property({ length: 20 })
  discountType!: string; // 'percentage' | 'fixed'

  @Property({ columnType: 'decimal(10,2)' })
  discountValue!: string;

  @Property({ nullable: true, columnType: 'decimal(10,2)' })
  maxDiscount?: string;

  @Property({ columnType: 'decimal(10,2)', default: '0' })
  minOrderAmount: string = '0';

  @Property({ default: 0 })
  minQuantity: number = 0;

  @Property({ nullable: true, type: 'timestamptz' })
  validFrom?: Date;

  @Property({ nullable: true, type: 'timestamptz' })
  validUntil?: Date;

  @Property({ nullable: true, type: 'jsonb' })
  validDays?: number[];

  @Property({ nullable: true, length: 5 })
  validTimeFrom?: string;

  @Property({ nullable: true, length: 5 })
  validTimeTo?: string;

  @Property({ default: 0 })
  maxUses: number = 0;

  @Property({ default: 0 })
  maxUsesPerCustomer: number = 0;

  @Property({ default: 0 })
  currentUses: number = 0;

  @Property({ default: false })
  firstOrderOnly: boolean = false;

  @Property({ default: false })
  excludePromotional: boolean = false;

  @Property({ nullable: true, length: 20 })
  deliveryTypeRestriction?: string;

  @Property({ nullable: true, type: 'jsonb' })
  applicableProductIds?: string[];

  @Property({ nullable: true, type: 'jsonb' })
  applicableCategoryIds?: string[];

  @Property({ nullable: true, type: 'jsonb' })
  applicableSectionIds?: string[];

  @Property({ default: true })
  isActive: boolean = true;

  @Property({ onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
