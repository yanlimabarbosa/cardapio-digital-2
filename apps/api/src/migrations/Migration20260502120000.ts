import { Migration } from '@mikro-orm/migrations';

export class Migration20260502120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "product_extras" add column if not exists "image_url" varchar null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "product_extras" drop column if exists "image_url";`);
  }
}
