import { Migration } from '@mikro-orm/migrations';

export class Migration20260321035700 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "orders" add column "order_number" int not null default 0;`);
    this.addSql(`UPDATE "orders" SET "order_number" = sub.rn FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn FROM "orders") sub WHERE "orders".id = sub.id;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "orders" drop column "order_number";`);
  }

}
