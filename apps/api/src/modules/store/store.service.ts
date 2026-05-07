import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { StoreSettings } from '../../entities';
import {
  getCombinedScheduleAvailability,
  getRangesForDay,
  getZonedParts,
  legacyToWeeklySchedule,
  normalizeWeeklySchedule,
  formatScheduleDayRanges,
  type WeeklySchedule,
} from '@cardapio/shared';

@Injectable()
export class StoreService {
  constructor(private readonly em: EntityManager) {}

  private readonly defaultSchedule: WeeklySchedule = {
    0: [{ start: '11:00', end: '21:00' }],
    1: [{ start: '11:00', end: '21:00' }],
    2: [{ start: '11:00', end: '21:00' }],
    3: [{ start: '11:00', end: '21:00' }],
    4: [{ start: '11:00', end: '21:00' }],
    5: [{ start: '11:00', end: '21:00' }],
    6: [{ start: '11:00', end: '21:00' }],
  };

  async getSettings(): Promise<StoreSettings> {
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
    return settings;
  }

  getEffectiveSchedule(settings: StoreSettings): WeeklySchedule {
    return normalizeWeeklySchedule(settings.weeklySchedule)
      ?? normalizeWeeklySchedule(legacyToWeeklySchedule(settings.openDays, settings.openingTime, settings.closingTime))
      ?? {};
  }

  async updateSettings(data: Partial<Pick<StoreSettings, 'openingTime' | 'closingTime' | 'openDays' | 'weeklySchedule' | 'forceClose' | 'forceOpen' | 'pointsPerReal' | 'receiptCnpj' | 'receiptAddress' | 'receiptPhone' | 'receiptFooter' | 'bannerUrl'>>) {
    const settings = await this.getSettings();
    if (data.openingTime !== undefined) settings.openingTime = data.openingTime;
    if (data.closingTime !== undefined) settings.closingTime = data.closingTime;
    if (data.openDays !== undefined) settings.openDays = data.openDays;
    if (data.weeklySchedule !== undefined) {
      settings.weeklySchedule = normalizeWeeklySchedule(data.weeklySchedule) ?? {};
    }
    if (data.forceClose !== undefined) {
      settings.forceClose = data.forceClose;
      if (data.forceClose) settings.forceOpen = false; // can't be both
    }
    if (data.forceOpen !== undefined) {
      settings.forceOpen = data.forceOpen;
      if (data.forceOpen) settings.forceClose = false; // can't be both
    }
    if (data.pointsPerReal !== undefined) {
      settings.pointsPerReal = String(data.pointsPerReal);
    }
    if (data.receiptCnpj !== undefined) settings.receiptCnpj = data.receiptCnpj;
    if (data.receiptAddress !== undefined) settings.receiptAddress = data.receiptAddress;
    if (data.receiptPhone !== undefined) settings.receiptPhone = data.receiptPhone;
    if (data.receiptFooter !== undefined) settings.receiptFooter = data.receiptFooter;
    if (data.bannerUrl !== undefined) settings.bannerUrl = data.bannerUrl;
    await this.em.flush();
    return settings;
  }

  async isOpen(at = new Date(), options?: { ignoreForceOpen?: boolean }): Promise<{
    open: boolean;
    reason?: string;
    opensAt?: string;
    closesAt?: string;
    openDays?: number[];
    weeklySchedule?: WeeklySchedule;
    nextOpenAt?: string;
    nextOpenLabel?: string;
    bannerUrl?: string;
  }> {
    const settings = await this.getSettings();
    const weeklySchedule = this.getEffectiveSchedule(settings);
    const dayRanges = getRangesForDay(weeklySchedule, getZonedParts(at).weekday);
    const opensAt = dayRanges[0]?.start ?? settings.openingTime;
    const closesAt = dayRanges[dayRanges.length - 1]?.end ?? settings.closingTime;
    const base = {
      opensAt,
      closesAt,
      openDays: settings.openDays,
      weeklySchedule,
      bannerUrl: settings.bannerUrl,
    };

    if (settings.forceClose) {
      return { open: false, reason: 'Estamos temporariamente fechados', ...base };
    }

    if (settings.forceOpen && !options?.ignoreForceOpen) {
      return { open: true, ...base };
    }

    const availability = getCombinedScheduleAvailability(
      [{ schedule: weeklySchedule, defaultAvailable: false }],
      at,
    );

    if (!availability.available) {
      return {
        open: false,
        reason: availability.nextAvailableLabel
          ? availability.nextAvailableLabel.replace('Disponível', 'Abrimos')
          : 'Fechado hoje',
        nextOpenAt: availability.nextAvailableAt,
        nextOpenLabel: availability.nextAvailableLabel,
        ...base,
      };
    }

    return { open: true, ...base };
  }

  getScheduleSummary(settings: StoreSettings): string[] {
    const schedule = this.getEffectiveSchedule(settings);
    return [0, 1, 2, 3, 4, 5, 6].map((day) => formatScheduleDayRanges(schedule, day as 0 | 1 | 2 | 3 | 4 | 5 | 6));
  }
}
