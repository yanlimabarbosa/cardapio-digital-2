import type { WeeklySchedule } from '@cardapio/shared';

export type AdminSectionProductReadModel = {
  readonly id: string;
  readonly imageUrl?: string;
  readonly name: string;
  readonly price: number;
};

export type AdminSectionReadModel = {
  readonly availabilitySchedule?: WeeklySchedule | null;
  readonly emoji?: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly label: string;
  readonly productCount: number;
  readonly products: readonly AdminSectionProductReadModel[];
  readonly sortOrder: number;
};
