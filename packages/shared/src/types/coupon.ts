export interface CouponResponse {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  minQuantity: number;
  validFrom: string | null;
  validUntil: string | null;
  validDays: number[] | null;
  validTimeFrom: string | null;
  validTimeTo: string | null;
  maxUses: number;
  maxUsesPerCustomer: number;
  currentUses: number;
  firstOrderOnly: boolean;
  excludePromotional: boolean;
  deliveryTypeRestriction: string | null;
  applicableProductIds: string[] | null;
  applicableCategoryIds: string[] | null;
  applicableSectionIds: string[] | null;
  isActive: boolean;
  createdAt: string;
}

export interface ValidateCouponRequest {
  code: string;
  items: Array<{ productId: string; quantity: number; extraIds?: string[] }>;
  deliveryType: 'pickup' | 'delivery';
  customerPhone: string;
}

export interface ValidateCouponResponse {
  valid: boolean;
  code: string;
  discountType?: string;
  discountValue?: number;
  calculatedDiscount?: number;
  eligibleAmount?: number;
  message?: string;
  reason?: string;
}
