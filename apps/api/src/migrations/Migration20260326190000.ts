import { Migration } from '@mikro-orm/migrations';

export class Migration20260326190000 extends Migration {
  override async up(): Promise<void> {
    // Create coupons table
    this.addSql(`
      create table "coupons" (
        "id" uuid not null default gen_random_uuid(),
        "code" varchar(50) not null,
        "discount_type" varchar(20) not null,
        "discount_value" decimal(10,2) not null,
        "max_discount" decimal(10,2) null default null,
        "min_order_amount" decimal(10,2) not null default 0,
        "min_quantity" int not null default 0,
        "valid_from" timestamptz null default null,
        "valid_until" timestamptz null default null,
        "valid_days" jsonb null default null,
        "valid_time_from" varchar(5) null default null,
        "valid_time_to" varchar(5) null default null,
        "max_uses" int not null default 0,
        "max_uses_per_customer" int not null default 0,
        "current_uses" int not null default 0,
        "first_order_only" boolean not null default false,
        "exclude_promotional" boolean not null default false,
        "delivery_type_restriction" varchar(20) null default null,
        "applicable_product_ids" jsonb null default null,
        "applicable_category_ids" jsonb null default null,
        "applicable_section_ids" jsonb null default null,
        "is_active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "coupons_pkey" primary key ("id"),
        constraint "coupons_code_unique" unique ("code")
      );
    `);

    // Create coupon_usages table
    this.addSql(`
      create table "coupon_usages" (
        "id" uuid not null default gen_random_uuid(),
        "coupon_id" uuid not null,
        "customer_id" uuid not null,
        "order_id" uuid not null,
        "used_at" timestamptz not null default now(),
        constraint "coupon_usages_pkey" primary key ("id"),
        constraint "coupon_usages_coupon_id_foreign" foreign key ("coupon_id") references "coupons" ("id") on update cascade,
        constraint "coupon_usages_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade,
        constraint "coupon_usages_order_id_foreign" foreign key ("order_id") references "orders" ("id") on update cascade
      );
    `);

    // Add coupon fields to orders
    this.addSql(`
      alter table "orders"
        add column "coupon_id" uuid null default null,
        add column "coupon_code" varchar(50) null default null,
        add column "discount_amount" decimal(10,2) null default null;
    `);

    this.addSql(`
      alter table "orders"
        add constraint "orders_coupon_id_foreign" foreign key ("coupon_id") references "coupons" ("id") on update cascade on delete set null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "orders" drop constraint if exists "orders_coupon_id_foreign";`);
    this.addSql(`alter table "orders" drop column if exists "coupon_id", drop column if exists "coupon_code", drop column if exists "discount_amount";`);
    this.addSql(`drop table if exists "coupon_usages";`);
    this.addSql(`drop table if exists "coupons";`);
  }
}
