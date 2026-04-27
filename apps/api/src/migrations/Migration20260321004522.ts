import { Migration } from '@mikro-orm/migrations';

export class Migration20260321004522 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "admin_users" ("id" uuid not null default gen_random_uuid(), "email" varchar(255) not null, "password_hash" varchar(255) not null, "name" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "admin_users_pkey" primary key ("id"));`);
    this.addSql(`alter table "admin_users" add constraint "admin_users_email_unique" unique ("email");`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "admin_users" cascade;`);
  }

}
