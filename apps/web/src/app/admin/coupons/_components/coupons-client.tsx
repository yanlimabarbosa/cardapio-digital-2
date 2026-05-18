'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, Power, Search, Tag, Loader2 } from 'lucide-react';
import { CouponDialog } from './coupon-dialog';
import type { CouponResponse } from '@cardapio/shared';

export function CouponsClient() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponResponse | null>(null);

  const { data: coupons, isLoading } = useQuery<CouponResponse[]>({
    queryKey: ['admin-coupons'],
    queryFn: () => adminFetch('/api/admin/coupons', token),
  });

  const createMutation = useMutation({
    mutationFn: (dto: any) =>
      adminFetch('/api/admin/coupons', token, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setShowDialog(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...dto }: any) =>
      adminFetch(`/api/admin/coupons/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setShowDialog(false);
      setEditingCoupon(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/coupons/${id}`, token, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });

  const filtered = (coupons ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.code.toLowerCase().includes(q);
  });

  function openCreate() {
    setEditingCoupon(null);
    setShowDialog(true);
  }

  function openEdit(coupon: CouponResponse) {
    setEditingCoupon(coupon);
    setShowDialog(true);
  }

  function handleSave(payload: any) {
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function formatDiscountLabel(c: CouponResponse) {
    if (c.discountType === 'percentage') {
      return `${c.discountValue}%`;
    }
    return formatCurrency(c.discountValue);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#3D2B1F]">Cupons</h1>
          <p className="text-sm text-[#8B7355]">
            {filtered.length} {filtered.length === 1 ? 'cupom' : 'cupons'} cadastrados
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Novo cupom
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A0]" />
        <input
          type="text"
          placeholder="Buscar por codigo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-[#E8DDD0] bg-white pl-9 pr-4 text-sm text-[#3D2B1F] outline-none placeholder:text-[#C4B5A0] focus:border-[#D4C8BA] focus:ring-2 focus:ring-[#E8DDD0]/50 sm:max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-terra-400" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E8DDD0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8DDD0] bg-[#FAF6F1]">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355]">Codigo</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355] hidden sm:table-cell">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#8B7355]">Desconto</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[#8B7355] hidden sm:table-cell">Usos</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[#8B7355]">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DDD0]">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className={`transition-colors hover:bg-[#FAF6F1] ${!c.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-terra-400 shrink-0" />
                      <span className="font-mono font-semibold text-[#3D2B1F]">{c.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#8B7355] hidden sm:table-cell">
                    {c.discountType === 'percentage' ? 'Porcentagem' : 'Valor fixo'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-terra-600">
                    {formatDiscountLabel(c)}
                  </td>
                  <td className="px-4 py-3 text-center text-[#8B7355] hidden sm:table-cell">
                    {c.currentUses}/{c.maxUses || '\u221E'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-1.5 text-[#8B7355] transition-colors hover:bg-[#FAF6F1] hover:text-[#3D2B1F]"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deactivateMutation.mutate(c.id)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          c.isActive
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-red-400 hover:bg-red-50'
                        }`}
                        aria-label={c.isActive ? 'Desativar' : 'Ativar'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#C4B5A0]">
                    {search ? 'Nenhum cupom encontrado' : 'Nenhum cupom cadastrado'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CouponDialog
        open={showDialog}
        coupon={editingCoupon}
        onSave={handleSave}
        onClose={() => {
          setShowDialog(false);
          setEditingCoupon(null);
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
