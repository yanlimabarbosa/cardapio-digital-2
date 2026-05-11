'use client';

import { useState } from 'react';
import { useMenu } from '@/hooks/menu/use-menu';
import { useStoreStatus } from '@/hooks/menu/use-store-status';
import { useSections } from '@/hooks/menu/use-sections';
import { usePruneExpiredScheduledFor } from '@/hooks/menu/use-prune-expired-scheduled-for';
import { useCartStore } from '@/stores/cart-store';
import { formatScheduledFor } from '@cardapio/shared';

export function useHomePage() {
  const scheduledFor = useCartStore((s) => s.scheduledFor);
  const setScheduledFor = useCartStore((s) => s.setScheduledFor);
  usePruneExpiredScheduledFor();
  const { data: storeStatus } = useStoreStatus();
  const { data: categories, isLoading, error } = useMenu(scheduledFor);
  const { data: sections } = useSections(scheduledFor);
  const [hoursOpen, setHoursOpen] = useState(false);

  const toggleHours = () => setHoursOpen(!hoursOpen);

  return {
    categories,
    isLoading,
    error,
    storeStatus,
    scheduledFor,
    scheduledForLabel: formatScheduledFor(scheduledFor),
    clearScheduledFor: () => setScheduledFor(null),
    hoursOpen,
    toggleHours,
    sections,
  };
}
