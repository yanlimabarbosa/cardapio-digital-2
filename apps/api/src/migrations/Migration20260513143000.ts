import { Migration } from '@mikro-orm/migrations';

export class Migration20260513143000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "delivery_areas"
      add column if not exists "match_normalized_keys" jsonb not null default '[]'::jsonb;
    `);

    this.addSql(`
      update "delivery_areas"
      set "match_normalized_keys" = jsonb_build_array("normalized_key")
      where "match_normalized_keys" = '[]'::jsonb;
    `);

    this.setMatchKeys('joao pessoa novo milenio', ['joao pessoa gramame']);
    this.setMatchKeys('joao pessoa colinas do sul', ['joao pessoa gramame']);
    this.setMatchKeys('joao pessoa parque do sol', [
      'joao pessoa gramame',
      'joao pessoa valentina de figueiredo',
    ]);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "delivery_areas" drop column if exists "match_normalized_keys";`);
  }

  private setMatchKeys(areaKey: string, matchKeys: readonly string[]): void {
    const values = matchKeys.map((key) => `'${key}'`).join(', ');
    this.addSql(`
      update "delivery_areas"
      set "match_normalized_keys" = jsonb_build_array(${values})
      where "normalized_key" = '${areaKey}';
    `);
  }
}
