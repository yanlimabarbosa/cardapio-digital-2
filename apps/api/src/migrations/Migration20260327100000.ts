import { Migration } from '@mikro-orm/migrations';

export class Migration20260327100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "store_settings" add column "receipt_cnpj" varchar(20) null, add column "receipt_address" text null, add column "receipt_phone" varchar(20) null, add column "receipt_footer" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "store_settings" drop column "receipt_cnpj", drop column "receipt_address", drop column "receipt_phone", drop column "receipt_footer";`);
  }

}
