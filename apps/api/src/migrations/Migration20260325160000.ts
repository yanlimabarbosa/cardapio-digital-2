import { Migration } from '@mikro-orm/migrations';

export class Migration20260325160000 extends Migration {
  override async up(): Promise<void> {
    // Create customers table
    this.addSql(`
      create table "customers" (
        "id" uuid not null default gen_random_uuid(),
        "token" uuid not null unique default gen_random_uuid(),
        "name" varchar(255) not null,
        "phone" varchar(20) not null unique,
        "email" varchar(255),
        "password_hash" varchar(255),
        "loyalty_points" int not null default 0,
        "is_active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "customers_pkey" primary key ("id")
      );
    `);

    this.addSql(`create index "idx_customers_phone" on "customers" ("phone");`);
    this.addSql(`create index "idx_customers_token" on "customers" ("token");`);

    // Add customer_id to orders (nullable for now, we'll backfill then make NOT NULL)
    this.addSql(`alter table "orders" add column "customer_id" uuid;`);

    // Backfill: create customers for existing orders based on phone
    this.addSql(`
      insert into "customers" ("name", "phone")
      select distinct on (customer_phone) customer_name, customer_phone
      from "orders"
      where customer_phone is not null
      on conflict ("phone") do nothing;
    `);

    // Link existing orders to their customers
    this.addSql(`
      update "orders" o
      set customer_id = c.id
      from "customers" c
      where o.customer_phone = c.phone;
    `);

    // For any remaining orders without a phone, create a placeholder customer
    this.addSql(`
      insert into "customers" ("name", "phone")
      select customer_name, 'unknown_' || o.id
      from "orders" o
      where o.customer_id is null
        and not exists (select 1 from "customers" where phone = 'unknown_' || o.id);
    `);

    this.addSql(`
      update "orders" o
      set customer_id = c.id
      from "customers" c
      where o.customer_id is null and c.phone = 'unknown_' || o.id;
    `);

    // Now make customer_id NOT NULL
    this.addSql(`alter table "orders" alter column "customer_id" set not null;`);

    this.addSql(`
      alter table "orders" add constraint "orders_customer_id_fkey"
      foreign key ("customer_id") references "customers" ("id");
    `);

    this.addSql(`create index "idx_orders_customer_id" on "orders" ("customer_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "orders" drop constraint if exists "orders_customer_id_fkey";`);
    this.addSql(`alter table "orders" drop column if exists "customer_id";`);
    this.addSql(`drop table if exists "customers";`);
  }
}
