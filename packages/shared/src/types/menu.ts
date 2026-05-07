import type { WeeklySchedule } from './schedule';

export interface ProductExtra {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

export interface OptionGroupOption {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

export interface OptionGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  required: boolean;
  sortOrder: number;
  options: OptionGroupOption[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  isCompound: boolean;
  extras: ProductExtra[];
  optionGroups?: OptionGroup[];
  isAvailable?: boolean;
  availabilityMessage?: string;
  nextAvailableAt?: string;
  // Promotional fields
  isPromotional: boolean;
  promotionalPrice: number | null;
  promotionActive: boolean;
  effectivePrice: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  availabilitySchedule?: WeeklySchedule | null;
  isAvailable?: boolean;
  availabilityMessage?: string;
  nextAvailableAt?: string;
  products: Product[];
}

export type MenuResponse = Category[];
