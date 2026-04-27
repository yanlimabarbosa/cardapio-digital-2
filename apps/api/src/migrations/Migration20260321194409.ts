import { Migration } from '@mikro-orm/migrations';

export class Migration20260321194409 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "products" add column "sort_order" int not null default 0;`);

    this.addSql(`alter table "store_settings" alter column "id" type int using ("id"::int);`);
    this.addSql(`create sequence if not exists "store_settings_id_seq";`);
    this.addSql(`select setval('store_settings_id_seq', (select max("id") from "store_settings"));`);
    this.addSql(`alter table "store_settings" alter column "id" set default nextval('store_settings_id_seq');`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "products" drop column "sort_order";`);

    this.addSql(`alter table "store_settings" alter column "id" type int4 using ("id"::int4);`);
  }

}
