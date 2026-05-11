'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useCartStore } from '@/stores/cart-store';
import type { Product } from '@cardapio/shared';

export function useCartHydration() {
  const items = useCartStore((s) => s.items);
  const scheduledFor = useCartStore((s) => s.scheduledFor);
  const hydrateItems = useCartStore((s) => s.hydrateItems);
  const hydratedRef = useRef<string | null>(null);

  const productIds = [...new Set(items.map((i) => i.productId))];
  const hydrationKey = `${productIds.join(',')}|${scheduledFor ?? 'now'}`;
  const scheduleQuery = scheduledFor ? `&scheduledFor=${encodeURIComponent(scheduledFor)}` : '';

  const { data: freshProducts, isLoading } = useQuery<Product[]>({
    queryKey: ['cart-products', productIds.join(','), scheduledFor ?? 'now'],
    queryFn: () => apiFetch(`/api/menu/products?ids=${productIds.join(',')}${scheduleQuery}`),
    enabled: productIds.length > 0 && hydratedRef.current !== hydrationKey,
    staleTime: 0,
  });

  useEffect(() => {
    if (freshProducts && hydratedRef.current !== hydrationKey) {
      hydratedRef.current = hydrationKey;
      hydrateItems(freshProducts);
    }
  }, [freshProducts, hydrateItems, hydrationKey]);

  return {
    isHydrating: isLoading && productIds.length > 0 && hydratedRef.current !== hydrationKey,
    freshProducts: freshProducts ?? [],
  };
}
