'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { WS_EVENTS } from '@cardapio/shared';
import { API_URL } from '@/lib/api-url';

export function useOrderSocket(
  orderId: string | null,
  onStatusChange?: (data: { id: string; status: string }) => void,
) {
  const queryClient = useQueryClient();
  const callbackRef = useRef(onStatusChange);
  callbackRef.current = onStatusChange;

  useEffect(() => {
    if (!orderId) return;

    const socket = io(`${API_URL}/kitchen`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on(WS_EVENTS.ORDER_STATUS_CHANGED, (data: { id: string; status: string }) => {
      if (data.id === orderId) {
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        queryClient.invalidateQueries({ queryKey: ['payment-status', orderId] });
        callbackRef.current?.(data);
      }
    });

    socket.on(WS_EVENTS.NEW_ORDER, (data: { id: string }) => {
      if (data.id === orderId) {
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        queryClient.invalidateQueries({ queryKey: ['payment-status', orderId] });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, queryClient]);
}
