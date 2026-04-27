import { Migration } from '@mikro-orm/migrations';

export class Migration20260324130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "daily_order_counter" (
        "date" date not null,
        "counter" int not null default 0,
        constraint "daily_order_counter_pkey" primary key ("date")
      );
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "daily_order_counter";`);
  }
}
