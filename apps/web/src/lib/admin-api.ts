import { API_URL } from './api-url';

export async function adminFetch<T>(
  path: string,
  token: string | null,
  options?: RequestInit,
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cardapio-auth');
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function adminUpload(
  file: File,
  token: string | null,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/admin/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export function getImageUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}
