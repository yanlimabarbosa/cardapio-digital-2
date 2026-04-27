'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import { Search, Users, Phone, Award } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { maskPhone } from '@/lib/utils';

interface CustomerRow {
  name: string;
  phone: string;
  hasPassword: boolean;
  loyaltyPoints: number;
  totalOrders: number;
  memberSince: string;
}

export function CustomersClient() {
  const { token } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data: customers, isLoading } = useQuery<CustomerRow[]>({
    queryKey: ['admin-customers', search],
    queryFn: () => adminFetch(`/api/admin/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`, token),
    enabled: !!token,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#2A1508]">Clientes</h1>
          <p className="text-sm text-[#8A6F40]">
            {customers?.length ?? 0} cliente{(customers?.length ?? 0) !== 1 ? 's' : ''} cadastrado{(customers?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6F40]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="pl-10"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#6B3E14] border-t-transparent" />
        </div>
      )}

      {customers && customers.length === 0 && (
        <div className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-[#B8963D]" />
          <p className="mt-3 text-sm text-[#8A6F40]">
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          </p>
        </div>
      )}

      {customers && customers.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#EAD8A0]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EAD8A0] bg-[#F0E3A8]">
                <th className="px-4 py-3 text-left font-semibold text-[#2A1508]">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-[#2A1508]">Telefone</th>
                <th className="px-4 py-3 text-center font-semibold text-[#2A1508]">Pedidos</th>
                <th className="px-4 py-3 text-center font-semibold text-[#2A1508]">Pontos</th>
                <th className="px-4 py-3 text-left font-semibold text-[#2A1508]">Desde</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.phone} className="border-b border-[#EAD8A0] last:border-0 hover:bg-[#F0E3A8]/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F0E3A8] text-xs font-bold text-[#6B3E14]">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-[#2A1508]">{c.name}</span>
                        {c.hasPassword && (
                          <span className="ml-1.5 inline-flex items-center rounded bg-green-100 px-1 py-0.5 text-[10px] font-bold text-green-700">
                            SENHA
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#8A6F40]">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {maskPhone(c.phone)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-[#2A1508]">
                    {c.totalOrders}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-[#6B3E14]">
                      <Award className="h-3 w-3" />
                      {c.loyaltyPoints}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#8A6F40]">
                    {new Date(c.memberSince).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
