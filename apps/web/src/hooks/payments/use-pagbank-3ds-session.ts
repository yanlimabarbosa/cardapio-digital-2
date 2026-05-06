'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PagBank3dsSessionResponse } from '@cardapio/shared';

export function usePagBank3dsSession() {
  return useMutation<PagBank3dsSessionResponse, Error, void>({
    mutationFn: () =>
      apiFetch('/api/payments/3ds-session', {
        method: 'POST',
      }),
  });
}
