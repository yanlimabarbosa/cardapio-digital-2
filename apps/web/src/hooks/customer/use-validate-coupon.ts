'use client';

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ValidateCouponRequest } from '@cardapio/shared';

interface ValidateResponse {
  valid: boolean;
  discount?: number;
  eligibleAmount?: number;
  reason?: string;
  coupon?: {
    code: string;
    discountType: string;
    discountValue: number;
  };
}

export function useValidateCoupon() {
  return useMutation<ValidateResponse, Error, ValidateCouponRequest>({
    mutationFn: (data) =>
      apiFetch('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
