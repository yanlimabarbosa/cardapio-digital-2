import { Migration } from '@mikro-orm/migrations';

export class Migration20260507001500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      update "store_settings"
      set "opening_time" = '11:00',
          "closing_time" = '21:00',
          "open_days" = '[0,1,2,3,4,5,6]'::jsonb
      where "id" = 1;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      update "store_settings"
      set "opening_time" = '09:00',
          "closing_time" = '23:00'
      where "id" = 1;
    `);
  }
}
