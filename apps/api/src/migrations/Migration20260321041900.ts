import { Migration } from '@mikro-orm/migrations';

export class Migration20260321041900 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "orders" add column "delivery_type" varchar(255) not null default 'pickup', add column "delivery_address" jsonb null;`);

    this.addSql(`alter table "store_settings" alter column "id" type int using ("id"::int);`);
    this.addSql(`alter table "store_settings" alter column "id" set default 1;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "orders" drop column "delivery_type", drop column "delivery_address";`);

    this.addSql(`alter table "store_settings" alter column "id" drop default;`);
    this.addSql(`alter table "store_settings" alter column "id" type int4 using ("id"::int4);`);
  }

}
