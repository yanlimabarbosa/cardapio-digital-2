'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomerData {
  name: string;
  phone: string;
  hasPassword: boolean;
  loyaltyPoints: number;
  isAdmin?: boolean;
}

interface CustomerState {
  token: string | null;
  name: string | null;
  phone: string | null;
  hasPassword: boolean;
  loyaltyPoints: number;
  isAdmin: boolean;
  setCustomer: (token: string, customer: CustomerData) => void;
  setHasPassword: (has: boolean) => void;
  setLoyaltyPoints: (points: number) => void;
  clear: () => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set) => ({
      token: null,
      name: null,
      phone: null,
      hasPassword: false,
      loyaltyPoints: 0,
      isAdmin: false,

      setCustomer: (token, customer) =>
        set({
          token,
          name: customer.name,
          phone: customer.phone,
          hasPassword: customer.hasPassword,
          loyaltyPoints: customer.loyaltyPoints,
          isAdmin: customer.isAdmin ?? false,
        }),

      setHasPassword: (hasPassword) => set({ hasPassword }),
      setLoyaltyPoints: (loyaltyPoints) => set({ loyaltyPoints }),

      clear: () =>
        set({
          token: null,
          name: null,
          phone: null,
          hasPassword: false,
          loyaltyPoints: 0,
          isAdmin: false,
        }),
    }),
    { name: 'cardapio-customer' },
  ),
);
