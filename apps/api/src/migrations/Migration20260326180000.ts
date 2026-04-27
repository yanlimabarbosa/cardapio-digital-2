import { Migration } from '@mikro-orm/migrations';

export class Migration20260326180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "products" add column "is_promotional" boolean not null default false;`);
    this.addSql(`alter table "products" add column "promotional_price" decimal(10,2);`);
    this.addSql(`alter table "products" add column "promotion_start_date" timestamptz;`);
    this.addSql(`alter table "products" add column "promotion_end_date" timestamptz;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "products" drop column if exists "is_promotional";`);
    this.addSql(`alter table "products" drop column if exists "promotional_price";`);
    this.addSql(`alter table "products" drop column if exists "promotion_start_date";`);
    this.addSql(`alter table "products" drop column if exists "promotion_end_date";`);
  }
}
