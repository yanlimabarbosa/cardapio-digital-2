import { Migration } from '@mikro-orm/migrations';

export class Migration20260326210000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "admin_users" add column "phone" varchar(20) unique;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "admin_users" drop column if exists "phone";`);
  }
}
