import { Migration } from '@mikro-orm/migrations';

export class Migration20260321040428 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "store_settings" ("id" serial primary key, "opening_time" varchar(255) not null, "closing_time" varchar(255) not null, "open_days" jsonb not null, "force_close" boolean not null default false);`);

    this.addSql(`alter table "orders" alter column "order_number" drop default;`);
    this.addSql(`alter table "orders" alter column "order_number" type int using ("order_number"::int);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "store_settings" cascade;`);

    this.addSql(`alter table "orders" alter column "order_number" type int4 using ("order_number"::int4);`);
    this.addSql(`alter table "orders" alter column "order_number" set default 0;`);
  }

}
