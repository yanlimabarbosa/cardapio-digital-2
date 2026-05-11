import type { WeeklySchedule } from '@cardapio/shared';
import type { ProductReadModel } from './product.read-model';

export type MenuReadModel = {
  readonly availabilityMessage?: string;
  readonly availabilitySchedule: WeeklySchedule | null;
  readonly description?: string;
  readonly id: string;
  readonly imageUrl?: string;
  readonly isAvailable: boolean;
  readonly name: string;
  readonly nextAvailableAt?: string;
  readonly products: readonly ProductReadModel[];
};
