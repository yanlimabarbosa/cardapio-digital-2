import { Migration } from '@mikro-orm/migrations';

export class Migration20260321204423 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "store_settings" add column "force_open" boolean not null default false;`);
    this.addSql(`alter table "store_settings" alter column "id" type int using ("id"::int);`);
    this.addSql(`alter table "store_settings" alter column "id" set default 1;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "store_settings" drop column "force_open";`);

    this.addSql(`alter table "store_settings" alter column "id" drop default;`);
    this.addSql(`alter table "store_settings" alter column "id" type int4 using ("id"::int4);`);
  }

}
