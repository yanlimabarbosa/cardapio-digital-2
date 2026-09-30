import { Migration } from '@mikro-orm/migrations';

export class Migration20260929120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "option_groups" add column "allow_repeat" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "option_groups" drop column "allow_repeat";`);
  }

}
