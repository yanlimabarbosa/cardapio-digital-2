import { Migration } from '@mikro-orm/migrations';

export class Migration20260413120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "option_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "min_selections" int NOT NULL DEFAULT 0,
        "max_selections" int NOT NULL DEFAULT 1,
        "sort_order" int NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "option_groups_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "option_groups_product_id_foreign" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON UPDATE CASCADE
      );
    `);

    this.addSql(`CREATE INDEX "idx_option_groups_product" ON "option_groups" ("product_id");`);

    this.addSql(`ALTER TABLE "products" ADD COLUMN "is_compound" boolean NOT NULL DEFAULT false;`);

    this.addSql(`ALTER TABLE "product_extras" ADD COLUMN "option_group_id" uuid NULL;`);
    this.addSql(`ALTER TABLE "product_extras" ADD COLUMN "sort_order" int NOT NULL DEFAULT 0;`);
    this.addSql(`
      ALTER TABLE "product_extras"
      ADD CONSTRAINT "product_extras_option_group_id_foreign"
      FOREIGN KEY ("option_group_id") REFERENCES "option_groups" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    this.addSql(`CREATE INDEX "idx_product_extras_option_group" ON "product_extras" ("option_group_id");`);

    this.addSql(`ALTER TABLE "order_items" ADD COLUMN "grouped_extras" jsonb NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "order_items" DROP COLUMN "grouped_extras";`);

    this.addSql(`DROP INDEX IF EXISTS "idx_product_extras_option_group";`);
    this.addSql(`ALTER TABLE "product_extras" DROP CONSTRAINT IF EXISTS "product_extras_option_group_id_foreign";`);
    this.addSql(`ALTER TABLE "product_extras" DROP COLUMN "option_group_id";`);
    this.addSql(`ALTER TABLE "product_extras" DROP COLUMN "sort_order";`);

    this.addSql(`ALTER TABLE "products" DROP COLUMN "is_compound";`);

    this.addSql(`DROP INDEX IF EXISTS "idx_option_groups_product";`);
    this.addSql(`DROP TABLE IF EXISTS "option_groups";`);
  }
}
