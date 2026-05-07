import { Migration } from '@mikro-orm/migrations';

export class Migration20260506120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "store_settings" add column "weekly_schedule" jsonb null;`);
    this.addSql(`alter table "categories" add column "availability_schedule" jsonb null;`);
    this.addSql(`alter table "sections" add column "availability_schedule" jsonb null;`);
    this.addSql(`alter table "orders" add column "scheduled_for" timestamptz null;`);

    const lunchEveryDay = `
      jsonb_build_object(
        '0', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '15:00')),
        '1', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '15:00')),
        '2', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '15:00')),
        '3', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '15:00')),
        '4', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '15:00')),
        '5', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '15:00')),
        '6', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '15:00'))
      )
    `;
    const dinnerMonSat = `
      jsonb_build_object(
        '0', '[]'::jsonb,
        '1', jsonb_build_array(jsonb_build_object('start', '18:00', 'end', '21:00')),
        '2', jsonb_build_array(jsonb_build_object('start', '18:00', 'end', '21:00')),
        '3', jsonb_build_array(jsonb_build_object('start', '18:00', 'end', '21:00')),
        '4', jsonb_build_array(jsonb_build_object('start', '18:00', 'end', '21:00')),
        '5', jsonb_build_array(jsonb_build_object('start', '18:00', 'end', '21:00')),
        '6', jsonb_build_array(jsonb_build_object('start', '18:00', 'end', '21:00'))
      )
    `;
    const bemComerStoreSchedule = `
      jsonb_build_object(
        '0', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '21:00')),
        '1', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '21:00')),
        '2', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '21:00')),
        '3', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '21:00')),
        '4', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '21:00')),
        '5', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '21:00')),
        '6', jsonb_build_array(jsonb_build_object('start', '11:00', 'end', '21:00'))
      )
    `;

    this.addSql(`update "store_settings" set "weekly_schedule" = ${bemComerStoreSchedule} where "weekly_schedule" is null;`);
    this.addSql(`
      update "categories"
      set "availability_schedule" = ${lunchEveryDay}
      where "availability_schedule" is null
        and (lower("name") like '%almoço%' or lower("name") like '%almoco%');
    `);
    this.addSql(`
      update "categories"
      set "availability_schedule" = ${dinnerMonSat}
      where "availability_schedule" is null
        and lower("name") like '%jantar%';
    `);
    this.addSql(`
      update "sections"
      set "availability_schedule" = ${lunchEveryDay}
      where "availability_schedule" is null
        and (lower("label") like '%almoço%' or lower("label") like '%almoco%');
    `);
    this.addSql(`
      update "sections"
      set "availability_schedule" = ${dinnerMonSat}
      where "availability_schedule" is null
        and lower("label") like '%jantar%';
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "orders" drop column if exists "scheduled_for";`);
    this.addSql(`alter table "sections" drop column if exists "availability_schedule";`);
    this.addSql(`alter table "categories" drop column if exists "availability_schedule";`);
    this.addSql(`alter table "store_settings" drop column if exists "weekly_schedule";`);
  }
}
