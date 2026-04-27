'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useCartStore } from '@/stores/cart-store';
import type { Product } from '@cardapio/shared';

export function useCartHydration() {
  const items = useCartStore((s) => s.items);
  const hydrateItems = useCartStore((s) => s.hydrateItems);
  const hydratedRef = useRef(false);

  const productIds = [...new Set(items.map((i) => i.productId))];

  const { data: freshProducts, isLoading } = useQuery<Product[]>({
    queryKey: ['cart-products', productIds.join(',')],
    queryFn: () => apiFetch(`/api/menu/products?ids=${productIds.join(',')}`),
    enabled: productIds.length > 0 && !hydratedRef.current,
    staleTime: 0,
  });

  useEffect(() => {
    if (freshProducts && !hydratedRef.current) {
      hydratedRef.current = true;
      hydrateItems(freshProducts);
    }
  }, [freshProducts, hydrateItems]);

  return { isHydrating: isLoading && productIds.length > 0 && !hydratedRef.current };
}
