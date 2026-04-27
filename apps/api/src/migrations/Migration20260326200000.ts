import { Migration } from '@mikro-orm/migrations';

export class Migration20260326200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "loyalty_transactions" (
        "id" uuid not null default gen_random_uuid(),
        "customer_id" uuid not null,
        "order_id" uuid,
        "points" int not null,
        "type" varchar(20) not null,
        "description" text,
        "created_at" timestamptz not null default now(),
        constraint "loyalty_transactions_pkey" primary key ("id"),
        constraint "loyalty_transactions_customer_id_fkey" foreign key ("customer_id") references "customers" ("id") on delete cascade,
        constraint "loyalty_transactions_order_id_fkey" foreign key ("order_id") references "orders" ("id") on delete set null
      );
    `);

    this.addSql(`alter table "products" add column "is_redeemable" boolean not null default false;`);
    this.addSql(`alter table "products" add column "redemption_cost" int not null default 0;`);

    this.addSql(`alter table "orders" add column "points_earned" int not null default 0;`);
    this.addSql(`alter table "orders" add column "points_spent" int not null default 0;`);

    this.addSql(`alter table "order_items" add column "is_redeemed" boolean not null default false;`);
    this.addSql(`alter table "order_items" add column "points_spent" int not null default 0;`);

    this.addSql(`alter table "store_settings" add column "points_per_real" decimal(5,2) not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "store_settings" drop column if exists "points_per_real";`);
    this.addSql(`alter table "order_items" drop column if exists "points_spent";`);
    this.addSql(`alter table "order_items" drop column if exists "is_redeemed";`);
    this.addSql(`alter table "orders" drop column if exists "points_spent";`);
    this.addSql(`alter table "orders" drop column if exists "points_earned";`);
    this.addSql(`alter table "products" drop column if exists "redemption_cost";`);
    this.addSql(`alter table "products" drop column if exists "is_redeemable";`);
    this.addSql(`drop table if exists "loyalty_transactions";`);
  }
}
