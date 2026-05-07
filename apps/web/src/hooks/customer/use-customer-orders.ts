'use client';

import { useQuery } from '@tanstack/react-query';
import { customerFetch } from '@/lib/customer-api';
import { useCustomerStore } from '@/stores/customer-store';

interface OrderItem {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  extras: Array<{ name: string; price: number }> | null;
}

interface CustomerOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  status: string;
  totalAmount: number;
  deliveryFee: number | null;
  paymentMethod: string;
  paymentStatus: string | null;
  deliveryType: string;
  scheduledFor?: string | null;
  items: OrderItem[];
  createdAt: string;
}

interface CustomerOrdersResponse {
  orders: CustomerOrder[];
  total: number;
  page: number;
  totalPages: number;
}

export function useCustomerOrders(page = 1, limit = 20) {
  const token = useCustomerStore((s) => s.token);

  return useQuery<CustomerOrdersResponse>({
    queryKey: ['customer-orders', token, page, limit],
    queryFn: () => customerFetch(`/api/customers/orders?page=${page}&limit=${limit}`),
    enabled: !!token,
  });
}
