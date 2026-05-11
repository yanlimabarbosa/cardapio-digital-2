import type { WeeklySchedule } from '@cardapio/shared';

export type AdminCategoryReadModel = {
  readonly availabilitySchedule?: WeeklySchedule | null;
  readonly createdAt?: Date;
  readonly description?: string;
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly name: string;
  readonly productCount: number;
  readonly sortOrder: number;
};
