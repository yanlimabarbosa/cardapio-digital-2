'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart-store';

const SCHEDULE_GRACE_MS = 60_000;

export function usePruneExpiredScheduledFor() {
  const scheduledFor = useCartStore((state) => state.scheduledFor);
  const setScheduledFor = useCartStore((state) => state.setScheduledFor);

  useEffect(() => {
    if (!scheduledFor) return;

    const scheduledAt = new Date(scheduledFor).getTime();
    if (!Number.isFinite(scheduledAt)) {
      setScheduledFor(null);
      return;
    }

    if (scheduledAt < Date.now() - SCHEDULE_GRACE_MS) {
      setScheduledFor(null);
    }
  }, [scheduledFor, setScheduledFor]);
}
