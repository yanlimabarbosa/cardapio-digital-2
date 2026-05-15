import { Migration } from '@mikro-orm/migrations';

export class Migration20260515120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "categories"
      add column if not exists "is_archived" boolean not null default false;
    `);

    this.addSql(`
      alter table "products"
      add column if not exists "is_sold_out" boolean not null default false,
      add column if not exists "is_archived" boolean not null default false;
    `);

    this.addSql(`
      alter table "product_extras"
      add column if not exists "is_sold_out" boolean not null default false,
      add column if not exists "is_archived" boolean not null default false;
    `);

    this.addSql(`
      alter table "option_groups"
      add column if not exists "is_archived" boolean not null default false;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "option_groups" drop column if exists "is_archived";`);
    this.addSql(`alter table "product_extras" drop column if exists "is_archived";`);
    this.addSql(`alter table "product_extras" drop column if exists "is_sold_out";`);
    this.addSql(`alter table "products" drop column if exists "is_archived";`);
    this.addSql(`alter table "products" drop column if exists "is_sold_out";`);
    this.addSql(`alter table "categories" drop column if exists "is_archived";`);
  }
}
