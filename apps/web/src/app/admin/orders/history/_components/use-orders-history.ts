'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';

interface HistoryOrder {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone?: string;
  status: string;
  totalAmount: number;
  deliveryFee: number | null;
  paymentMethod: string;
  paymentStatus?: string;
  deliveryType: string;
  scheduledFor?: string | null;
  deliveryAddress?: {
    neighborhood: string;
    city: string;
  };
  itemCount: number;
  items: Array<{
    id: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    extras: Array<{ name: string; price: number }> | null;
  }>;
  createdAt: string;
}

interface HistoryResponse {
  data: HistoryOrder[];
  total: number;
  page: number;
  totalPages: number;
}

export function useOrdersHistory() {
  const token = useAuthStore((s) => s.token);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (dateFrom) params.set('from', dateFrom);
  if (dateTo) params.set('to', dateTo);

  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: ['admin-orders-history', page, search, status, dateFrom, dateTo],
    queryFn: () => adminFetch(`/api/admin/orders/history?${params.toString()}`, token),
  });

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleSearch(q: string) {
    setSearch(q);
    setPage(1);
  }

  function handleStatusFilter(s: string) {
    setStatus(s);
    setPage(1);
  }

  function handleDateFrom(d: string) {
    setDateFrom(d);
    setPage(1);
  }

  function handleDateTo(d: string) {
    setDateTo(d);
    setPage(1);
  }

  return {
    orders: data?.data ?? [],
    total: data?.total ?? 0,
    page,
    totalPages: data?.totalPages ?? 1,
    setPage,
    search,
    handleSearch,
    status,
    handleStatusFilter,
    dateFrom,
    handleDateFrom,
    dateTo,
    handleDateTo,
    isLoading,
    expandedId,
    toggleExpand,
  };
}
