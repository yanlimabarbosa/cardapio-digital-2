import { Migration } from '@mikro-orm/migrations';

export class Migration20260816155500 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "delivery_drivers" add column "calculates_fee" boolean not null default false, add column "balance_cents" int not null default 0;');
  }

  override async down(): Promise<void> {
    this.addSql('alter table "delivery_drivers" drop column "calculates_fee", drop column "balance_cents";');
  }
}
