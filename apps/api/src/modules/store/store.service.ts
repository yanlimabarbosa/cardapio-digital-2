import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { StoreSettings } from '../../entities';

@Injectable()
export class StoreService {
  constructor(private readonly em: EntityManager) {}

  async getSettings(): Promise<StoreSettings> {
    let settings = await this.em.findOne(StoreSettings, { id: 1 });
    if (!settings) {
      settings = this.em.create(StoreSettings, {
        id: 1,
        openingTime: '09:00',
        closingTime: '23:00',
        openDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
        forceClose: false,
      });
      await this.em.flush();
    }
    return settings;
  }

  async updateSettings(data: Partial<Pick<StoreSettings, 'openingTime' | 'closingTime' | 'openDays' | 'forceClose' | 'forceOpen' | 'pointsPerReal' | 'receiptCnpj' | 'receiptAddress' | 'receiptPhone' | 'receiptFooter' | 'bannerUrl'>>) {
    const settings = await this.getSettings();
    if (data.openingTime !== undefined) settings.openingTime = data.openingTime;
    if (data.closingTime !== undefined) settings.closingTime = data.closingTime;
    if (data.openDays !== undefined) settings.openDays = data.openDays;
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

  async isOpen(): Promise<{ open: boolean; reason?: string; opensAt?: string; closesAt?: string; openDays?: number[]; bannerUrl?: string }> {
    const settings = await this.getSettings();
    const base = { opensAt: settings.openingTime, closesAt: settings.closingTime, openDays: settings.openDays, bannerUrl: settings.bannerUrl };

    if (settings.forceClose) {
      return { open: false, reason: 'Estamos temporariamente fechados', ...base };
    }

    if (settings.forceOpen) {
      return { open: true, ...base };
    }

    const now = new Date();
    const dayOfWeek = now.getDay();

    if (!settings.openDays.includes(dayOfWeek)) {
      return { open: false, reason: 'Fechado hoje', ...base };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = settings.openingTime.split(':').map(Number);
    const [closeH, closeM] = settings.closingTime.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const isOpen = openMinutes < closeMinutes
      ? currentMinutes >= openMinutes && currentMinutes < closeMinutes
      : currentMinutes >= openMinutes || currentMinutes < closeMinutes;

    if (!isOpen) {
      const reason = currentMinutes < openMinutes
        ? `Abrimos às ${settings.openingTime}`
        : `Fechamos às ${settings.closingTime}`;
      return { open: false, reason, ...base };
    }

    return { open: true, ...base };
  }
}
