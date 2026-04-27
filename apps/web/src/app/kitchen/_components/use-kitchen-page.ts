'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function useKitchenPage() {
  const router = useRouter();
  const { token, user, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.push('/admin/login');
    }
  }, [hydrated, token, router]);

  function handleLogout() {
    logout();
    router.push('/admin/login');
  }

  const ready = hydrated && !!token;

  return { user, ready, handleLogout };
}
