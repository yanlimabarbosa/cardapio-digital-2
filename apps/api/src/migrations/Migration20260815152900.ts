import { Migration } from '@mikro-orm/migrations';

export class Migration20260815152900 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "delivery_drivers" ("id" uuid not null default gen_random_uuid(), "name" varchar(255) not null, "phone" varchar(20) not null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "delivery_drivers_pkey" primary key ("id"));`);

    this.addSql(`alter table "orders" add column "driver_id" uuid null, add column "driver_name" varchar(255) null;`);
    this.addSql(`alter table "orders" add constraint "orders_driver_id_foreign" foreign key ("driver_id") references "delivery_drivers" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "orders" drop constraint if exists "orders_payment_method_check";`);

    this.addSql(`alter table "store_settings" add column "free_night_delivery_enabled" boolean not null default false, add column "free_night_delivery_start" varchar(255) null, add column "free_night_delivery_end" varchar(255) null;`);
  }
}
