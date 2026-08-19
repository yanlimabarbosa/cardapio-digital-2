import { Migration } from '@mikro-orm/migrations';

export class Migration20260819024929 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "combined_limits" ("id" uuid not null default gen_random_uuid(), "product_id" uuid not null, "name" varchar(255) not null, "max_selections" int not null default 1, "is_archived" boolean not null default false, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "combined_limits_pkey" primary key ("id"));`);

    this.addSql(`alter table "combined_limits" add constraint "combined_limits_product_id_foreign" foreign key ("product_id") references "products" ("id") on update cascade;`);

    this.addSql(`alter table "option_groups" add column "combined_limit_id" uuid null;`);

    this.addSql(`alter table "option_groups" add constraint "option_groups_combined_limit_id_foreign" foreign key ("combined_limit_id") references "combined_limits" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "option_groups" drop constraint "option_groups_combined_limit_id_foreign";`);

    this.addSql(`alter table "option_groups" drop column "combined_limit_id";`);

    this.addSql(`drop table if exists "combined_limits" cascade;`);
  }

}
