import { Migration } from '@mikro-orm/migrations';

export class Migration20260327110000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "store_settings" add column "banner_url" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "store_settings" drop column "banner_url";`);
  }
}
