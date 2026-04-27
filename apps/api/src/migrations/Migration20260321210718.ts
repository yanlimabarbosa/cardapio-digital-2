import { Migration } from '@mikro-orm/migrations';

export class Migration20260321210718 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "orders" drop constraint if exists "orders_status_check";`);

    this.addSql(`alter table "orders" add constraint "orders_status_check" check("status" in ('pending_payment', 'paid', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'));`);

    this.addSql(`alter table "store_settings" alter column "id" type int using ("id"::int);`);
    this.addSql(`create sequence if not exists "store_settings_id_seq";`);
    this.addSql(`select setval('store_settings_id_seq', (select max("id") from "store_settings"));`);
    this.addSql(`alter table "store_settings" alter column "id" set default nextval('store_settings_id_seq');`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "orders" drop constraint if exists "orders_status_check";`);

    this.addSql(`alter table "orders" add constraint "orders_status_check" check("status" in ('pending_payment', 'paid', 'preparing', 'ready', 'delivered', 'cancelled'));`);

    this.addSql(`alter table "store_settings" alter column "id" type int4 using ("id"::int4);`);
  }

}
