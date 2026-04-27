import { Migration } from '@mikro-orm/migrations';

export class Migration20260320204943 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "categories" ("id" uuid not null default gen_random_uuid(), "name" varchar(255) not null, "description" varchar(255) null, "image_url" varchar null, "sort_order" int not null default 0, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "categories_pkey" primary key ("id"));`);

    this.addSql(`create table "orders" ("id" uuid not null default gen_random_uuid(), "customer_name" varchar(255) not null, "customer_phone" varchar(255) null, "status" text check ("status" in ('pending_payment', 'paid', 'preparing', 'ready', 'delivered', 'cancelled')) not null default 'pending_payment', "total_amount" decimal(10,2) not null, "payment_method" text check ("payment_method" in ('pix', 'credit_card')) not null, "payment_id" varchar(255) null, "payment_status" text check ("payment_status" in ('pending', 'approved', 'rejected', 'refunded')) null, "notes" text null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "orders_pkey" primary key ("id"));`);

    this.addSql(`create table "order_items" ("id" uuid not null default gen_random_uuid(), "order_id" uuid not null, "product_id" uuid not null, "product_name" varchar(255) not null, "unit_price" decimal(10,2) not null, "quantity" int not null, "subtotal" decimal(10,2) not null, "extras" jsonb null, constraint "order_items_pkey" primary key ("id"));`);

    this.addSql(`create table "products" ("id" uuid not null default gen_random_uuid(), "category_id" uuid not null, "name" varchar(255) not null, "description" varchar(255) null, "price" decimal(10,2) not null, "image_url" varchar null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "products_pkey" primary key ("id"));`);

    this.addSql(`create table "product_extras" ("id" uuid not null default gen_random_uuid(), "product_id" uuid not null, "name" varchar(255) not null, "price" decimal(10,2) not null, "is_active" boolean not null default true, constraint "product_extras_pkey" primary key ("id"));`);

    this.addSql(`alter table "order_items" add constraint "order_items_order_id_foreign" foreign key ("order_id") references "orders" ("id") on update cascade;`);

    this.addSql(`alter table "products" add constraint "products_category_id_foreign" foreign key ("category_id") references "categories" ("id") on update cascade;`);

    this.addSql(`alter table "product_extras" add constraint "product_extras_product_id_foreign" foreign key ("product_id") references "products" ("id") on update cascade;`);
  }

}
