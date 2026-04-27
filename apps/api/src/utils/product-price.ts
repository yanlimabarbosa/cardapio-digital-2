import type { Product } from '../entities/product.entity';

export function isPromotionActive(product: Product): boolean {
  if (!product.isPromotional || !product.promotionalPrice) return false;
  const now = new Date();
  if (product.promotionStartDate && now < product.promotionStartDate) return false;
  if (product.promotionEndDate && now > product.promotionEndDate) return false;
  return true;
}

export function getEffectivePrice(product: Product): string {
  return isPromotionActive(product) ? product.promotionalPrice! : product.price;
}
