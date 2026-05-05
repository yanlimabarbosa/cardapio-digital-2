import { useCustomerStore } from '@/stores/customer-store';
import { API_URL } from './api-url';

export function getCustomerHeaders(): Record<string, string> {
  const token = useCustomerStore.getState().token;
  return token ? { 'X-Customer-Token': token } : {};
}

export async function customerFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getCustomerHeaders(),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}
