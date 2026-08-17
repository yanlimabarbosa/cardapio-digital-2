'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin-api';
import { useAuthStore } from '@/stores/auth-store';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, maskPhone } from '@/lib/utils';
import { Loader2, Plus, Pencil, Trash2, X, Check, Bike } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  calculatesFee: boolean;
  balanceCents: number;
}

const controlClass =
  'rounded-xl border-[#D8C5B2] bg-white text-[#3D2B1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(61,43,31,0.04)] placeholder:text-[#8B7355]/50 focus-visible:ring-[#A0603A]/20 focus-visible:ring-offset-0';

export function DriversClient() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ['admin-drivers'],
    queryFn: () => adminFetch('/api/admin/drivers', token),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; calculatesFee: boolean }) =>
      adminFetch('/api/admin/drivers', token, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      setShowAdd(false);
      setNewName('');
      setNewPhone('');
      setNewCalculatesFee(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; phone?: string; isActive?: boolean; calculatesFee?: boolean }) =>
      adminFetch(`/api/admin/drivers/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      adminFetch(`/api/admin/drivers/${id}`, token, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] });
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCalculatesFee, setNewCalculatesFee] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCalculatesFee, setEditCalculatesFee] = useState(false);

  function startEdit(driver: Driver) {
    setEditingId(driver.id);
    setEditName(driver.name);
    setEditPhone(maskPhone(driver.phone));
    setEditCalculatesFee(driver.calculatesFee);
  }

  function handleCreate() {
    if (!newName.trim() || !newPhone.trim()) return;
    createMutation.mutate({ name: newName.trim(), phone: newPhone.replace(/\D/g, ''), calculatesFee: newCalculatesFee });
  }

  function handleUpdate() {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim(), phone: editPhone.replace(/\D/g, ''), calculatesFee: editCalculatesFee });
  }

  function handleToggleActive(driver: Driver) {
    updateMutation.mutate({ id: driver.id, isActive: !driver.isActive });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: 'spring', damping: 24, stiffness: 300 }}
      className="rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-6 shadow-[0_0_8px_rgba(61,43,31,0.12)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bike className="h-4 w-4 text-[#A0603A]" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8B7355]">
            Motoboys
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg bg-[#A0603A] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#8B4F2D]"
        >
          {showAdd ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showAdd ? 'Cancelar' : 'Adicionar'}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-4 rounded-xl border border-[#E8DDD0] bg-[#FAF6F1] p-4 space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                  Nome
                </label>
                <Input
                  type="text"
                  placeholder="Nome do motoboy"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={cn(controlClass, 'h-10')}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
                  Telefone
                </label>
                <Input
                  type="text"
                  inputMode="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  maxLength={15}
                  value={newPhone}
                  onChange={(e) => setNewPhone(maskPhone(e.target.value))}
                  className={cn(controlClass, 'h-10 w-52')}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newCalculatesFee}
                  onChange={(e) => setNewCalculatesFee(e.target.checked)}
                  className="rounded border-[#D8C5B2] text-[#A0603A] focus:ring-[#A0603A]/20"
                />
                <span className="text-xs font-semibold text-[#3D2B1F]">Contabilizar fretes automaticamente</span>
              </label>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newName.trim() || !newPhone.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-[#A0603A] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#8B4F2D] disabled:cursor-not-allowed disabled:bg-[#D4C8BA]"
              >
                {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Salvar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#A0603A]" />
        </div>
      ) : !drivers || drivers.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#8B7355]">
          Nenhum motoboy cadastrado. Adicione um acima.
        </p>
      ) : (
        <div className="space-y-2">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                driver.isActive
                  ? 'border-[#E8DDD0] bg-white'
                  : 'border-red-200 bg-red-50/50',
              )}
            >
              {editingId === driver.id ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={cn(controlClass, 'h-9 w-40')}
                  />
                  <Input
                    type="text"
                    inputMode="tel"
                    maxLength={15}
                    value={editPhone}
                    onChange={(e) => setEditPhone(maskPhone(e.target.value))}
                    className={cn(controlClass, 'h-9 w-40')}
                  />
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-[#D8C5B2]">
                    <input
                      type="checkbox"
                      checked={editCalculatesFee}
                      onChange={(e) => setEditCalculatesFee(e.target.checked)}
                      className="rounded border-[#D8C5B2] text-[#A0603A] focus:ring-[#A0603A]/20"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">Contabilizar Frete</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={updateMutation.isPending}
                    className="rounded-lg bg-emerald-500 p-1.5 text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-[#E8DDD0] p-1.5 text-[#8B7355] transition-colors hover:bg-[#FAF6F1]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#3D2B1F] truncate">
                      {driver.name}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-[#8B7355]">
                        {maskPhone(driver.phone)}
                      </p>
                      {driver.calculatesFee && (
                        <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          Saldo: {(driver.balanceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(driver)}
                      disabled={updateMutation.isPending}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors',
                        driver.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100',
                      )}
                    >
                      {driver.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(driver)}
                      className="rounded-lg p-1.5 text-[#8B7355] transition-colors hover:bg-[#FAF6F1] hover:text-[#A0603A]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir motoboy ${driver.name}?`)) {
                          deleteMutation.mutate(driver.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg p-1.5 text-[#C4B5A0] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
