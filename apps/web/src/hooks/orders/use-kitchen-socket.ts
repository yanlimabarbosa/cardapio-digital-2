'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { WS_EVENTS } from '@cardapio/shared';
import { API_URL } from '@/lib/api-url';

export function useKitchenSocket() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const socket = io(`${API_URL}/kitchen`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      auth: { token },
    });

    socket.on(WS_EVENTS.NEW_ORDER, () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      try {
        new Audio('/notification.mp3').play().catch(() => {});
      } catch {}
    });

    socket.on(WS_EVENTS.ORDER_STATUS_CHANGED, () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, token]);
}
