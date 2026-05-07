'use client';

import { useState } from 'react';
import { useMenu } from '@/hooks/menu/use-menu';
import { useStoreStatus } from '@/hooks/menu/use-store-status';
import { useSections } from '@/hooks/menu/use-sections';

export function useHomePage() {
  const { data: storeStatus } = useStoreStatus();
  const { data: categories, isLoading, error } = useMenu();
  const { data: sections } = useSections();
  const [hoursOpen, setHoursOpen] = useState(false);

  const toggleHours = () => setHoursOpen(!hoursOpen);

  return {
    categories,
    isLoading,
    error,
    storeStatus,
    hoursOpen,
    toggleHours,
    sections,
  };
}
