import { Migration } from '@mikro-orm/migrations';

export class Migration20260518060000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "store_settings"
      add column if not exists "meta_pixel_enabled" boolean not null default false,
      add column if not exists "meta_pixel_ids" jsonb not null default '[]'::jsonb;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "store_settings" drop column if exists "meta_pixel_ids";`);
    this.addSql(`alter table "store_settings" drop column if exists "meta_pixel_enabled";`);
  }
}
