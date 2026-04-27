import { Migration } from '@mikro-orm/migrations';

export class Migration20260324140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "sections" (
        "id" uuid not null default gen_random_uuid(),
        "label" varchar(255) not null,
        "emoji" varchar(32) not null default '',
        "sort_order" int not null default 0,
        "is_active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        constraint "sections_pkey" primary key ("id")
      );
    `);

    this.addSql(`
      create table "section_products" (
        "id" uuid not null default gen_random_uuid(),
        "section_id" uuid not null,
        "product_id" uuid not null,
        "sort_order" int not null default 0,
        constraint "section_products_pkey" primary key ("id"),
        constraint "section_products_section_id_fkey" foreign key ("section_id") references "sections" ("id") on delete cascade,
        constraint "section_products_product_id_fkey" foreign key ("product_id") references "products" ("id") on delete cascade
      );
    `);

    // Migrate existing featured products into a "Destaques" section
    this.addSql(`
      insert into "sections" ("id", "label", "emoji", "sort_order")
      select gen_random_uuid(), 'Destaques', '✨', 0
      where exists (select 1 from "products" where "is_featured" = true);
    `);

    this.addSql(`
      insert into "section_products" ("section_id", "product_id", "sort_order")
      select s.id, p.id, p.featured_order
      from "products" p, "sections" s
      where p."is_featured" = true
      order by p."featured_order";
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "section_products";`);
    this.addSql(`drop table if exists "sections";`);
  }
}
