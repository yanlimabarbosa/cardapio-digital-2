'use client';

import { useQuery } from '@tanstack/react-query';
import { customerFetch } from '@/lib/customer-api';
import { useCustomerStore } from '@/stores/customer-store';

interface CustomerProfile {
  name: string;
  phone: string;
  hasPassword: boolean;
  loyaltyPoints: number;
  totalOrders: number;
  memberSince: string;
}

export function useCustomerProfile() {
  const token = useCustomerStore((s) => s.token);

  return useQuery<CustomerProfile>({
    queryKey: ['customer-profile', token],
    queryFn: () => customerFetch('/api/customers/me'),
    enabled: !!token,
    staleTime: 60_000,
  });
}
