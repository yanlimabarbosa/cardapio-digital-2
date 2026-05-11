import type { WeeklySchedule } from '@cardapio/shared';
import type { ProductExtraReadModel } from './product.read-model';

export type SectionProductReadModel = {
  readonly availabilityMessage?: string;
  readonly description?: string;
  readonly effectivePrice: number;
  readonly extras: readonly ProductExtraReadModel[];
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly isAvailable: boolean;
  readonly isCompound: boolean;
  readonly isPromotional: boolean;
  readonly name: string;
  readonly nextAvailableAt?: string;
  readonly price: number;
  readonly promotionActive: boolean;
  readonly promotionalPrice: number | null;
};

export type SectionReadModel = {
  readonly availabilityMessage?: string;
  readonly availabilitySchedule: WeeklySchedule | null;
  readonly emoji?: string;
  readonly id: string;
  readonly isAvailable: boolean;
  readonly label: string;
  readonly nextAvailableAt?: string;
  readonly products: readonly SectionProductReadModel[];
};
