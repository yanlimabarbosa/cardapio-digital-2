import { EntityManager } from '@mikro-orm/postgresql';
import { normalizeWeeklySchedule, type WeeklySchedule } from '@cardapio/shared';
import { StoreSettings } from '../../../../entities';
import type {
  StoreSettingsModel,
  StoreSettingsRepository,
} from '../../application/ports/store-settings.repository.port';

export class MikroOrmStoreSettingsRepository implements StoreSettingsRepository {
  private readonly defaultSchedule: WeeklySchedule = {
    0: [{ start: '11:00', end: '21:00' }],
    1: [{ start: '11:00', end: '21:00' }],
    2: [{ start: '11:00', end: '21:00' }],
    3: [{ start: '11:00', end: '21:00' }],
    4: [{ start: '11:00', end: '21:00' }],
    5: [{ start: '11:00', end: '21:00' }],
    6: [{ start: '11:00', end: '21:00' }],
  };

  public constructor(private readonly em: EntityManager) {}

  public async get(): Promise<StoreSettingsModel> {
    let settings = await this.em.findOne(StoreSettings, { id: 1 });

    if (!settings) {
      settings = this.em.create(StoreSettings, {
        id: 1,
        openingTime: '11:00',
        closingTime: '21:00',
        openDays: [0, 1, 2, 3, 4, 5, 6],
        weeklySchedule: this.defaultSchedule,
        forceClose: false,
      });
      await this.em.flush();
    }

    return this.toModel(settings);
  }

  public async save(settings: StoreSettingsModel): Promise<StoreSettingsModel> {
    let entity = await this.em.findOne(StoreSettings, { id: settings.id });

    if (!entity) {
      entity = this.em.create(StoreSettings, {
        id: settings.id,
        openingTime: settings.openingTime,
        closingTime: settings.closingTime,
        openDays: [...settings.openDays],
      });
    }

    this.applyModel(entity, settings);
    await this.em.flush();

    return this.toModel(entity);
  }

  private toModel(settings: StoreSettings): StoreSettingsModel {
    return {
      id: settings.id,
      openingTime: settings.openingTime,
      closingTime: settings.closingTime,
      openDays: [...settings.openDays],
      weeklySchedule: settings.weeklySchedule
        ? normalizeWeeklySchedule(settings.weeklySchedule)
        : settings.weeklySchedule,
      forceClose: !!settings.forceClose,
      forceOpen: !!settings.forceOpen,
      pointsPerReal: settings.pointsPerReal ?? '0',
      receiptCnpj: settings.receiptCnpj,
      receiptAddress: settings.receiptAddress,
      receiptPhone: settings.receiptPhone,
      receiptFooter: settings.receiptFooter,
      bannerUrl: settings.bannerUrl,
    };
  }

  private applyModel(entity: StoreSettings, settings: StoreSettingsModel): void {
    entity.id = settings.id;
    entity.openingTime = settings.openingTime;
    entity.closingTime = settings.closingTime;
    entity.openDays = [...settings.openDays];
    entity.weeklySchedule = settings.weeklySchedule
      ? normalizeWeeklySchedule(settings.weeklySchedule)
      : settings.weeklySchedule;
    entity.forceClose = settings.forceClose;
    entity.forceOpen = settings.forceOpen;
    entity.pointsPerReal = settings.pointsPerReal;
    entity.receiptCnpj = settings.receiptCnpj;
    entity.receiptAddress = settings.receiptAddress;
    entity.receiptPhone = settings.receiptPhone;
    entity.receiptFooter = settings.receiptFooter;
    entity.bannerUrl = settings.bannerUrl;
  }
}
