import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import type { WeeklySchedule } from '@cardapio/shared';

@Entity({ tableName: 'store_settings' })
export class StoreSettings {
  @PrimaryKey()
  id: number = 1;

  @Property()
  openingTime!: string; // "09:00"

  @Property()
  closingTime!: string; // "23:00"

  @Property({ type: 'jsonb' })
  openDays!: number[]; // [1,2,3,4,5,6] = Mon-Sat (0=Sun)

  @Property({ type: 'jsonb', nullable: true })
  weeklySchedule?: WeeklySchedule | null;

  @Property({ default: false })
  forceClose?: boolean = false; // Manual override to close

  @Property({ default: false })
  forceOpen?: boolean = false; // Manual override to open

  @Property({ default: false })
  freeNightDeliveryEnabled?: boolean = false;

  @Property({ nullable: true })
  freeNightDeliveryStart?: string; // "18:00"

  @Property({ nullable: true })
  freeNightDeliveryEnd?: string; // "23:59"

  @Property({ columnType: 'decimal(5,2)', default: '0' })
  pointsPerReal?: string = '0';

  @Property({ length: 20, nullable: true })
  receiptCnpj?: string;

  @Property({ columnType: 'text', nullable: true })
  receiptAddress?: string;

  @Property({ length: 20, nullable: true })
  receiptPhone?: string;

  @Property({ columnType: 'text', nullable: true })
  receiptFooter?: string;

  @Property({ columnType: 'text', nullable: true })
  bannerUrl?: string;

  @Property({ default: false })
  metaPixelEnabled?: boolean = false;

  @Property({ type: 'jsonb', nullable: true })
  metaPixelIds?: string[] | null;
}
