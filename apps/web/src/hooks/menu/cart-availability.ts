'use client';

import type { Product } from '@cardapio/shared';
import { formatScheduledFor } from '@cardapio/shared';
import type { CartItem } from '@/stores/cart-store';

export function getCartAvailabilityIssue(
  items: CartItem[],
  freshProducts: Product[],
  scheduledFor: string | null,
): string | null {
  if (scheduledFor) return null;

  const freshById = new Map(freshProducts.map((product) => [product.id, product]));
  for (const item of items) {
    const product = freshById.get(item.productId);
    if (!product) continue;
    if (product.isAvailable !== false) continue;

    const when = formatScheduledFor(product.nextAvailableAt ?? null);
    if (when) return `${item.productName}: disponível apenas em ${when}`;
    return `${item.productName}: indisponível no momento`;
  }

  return null;
}
