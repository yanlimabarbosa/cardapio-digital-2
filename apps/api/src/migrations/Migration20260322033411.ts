import { Migration } from '@mikro-orm/migrations';

export class Migration20260322033411 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "products" add column "is_featured" boolean not null default false, add column "featured_order" int not null default 0;`);

    this.addSql(`alter table "store_settings" alter column "id" type int using ("id"::int);`);
    this.addSql(`alter table "store_settings" alter column "id" set default 1;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "products" drop column "is_featured", drop column "featured_order";`);

    this.addSql(`alter table "store_settings" alter column "id" drop default;`);
    this.addSql(`alter table "store_settings" alter column "id" type int4 using ("id"::int4);`);
  }

}
