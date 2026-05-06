import { Migration } from '@mikro-orm/migrations';

export class Migration20260505153000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "orders" drop constraint if exists "orders_payment_method_check";`);
    this.addSql(`alter table "orders" add constraint "orders_payment_method_check" check ("payment_method" in ('pix', 'credit_card', 'debit_card'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "orders" drop constraint if exists "orders_payment_method_check";`);
    this.addSql(`alter table "orders" add constraint "orders_payment_method_check" check ("payment_method" in ('pix', 'credit_card'));`);
  }
}
