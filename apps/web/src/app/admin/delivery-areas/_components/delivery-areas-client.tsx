'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Power, Search, MapPin, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeliveryAreasPage } from './use-delivery-areas-page';
import type { DeliveryAreaResponse } from '@cardapio/shared';

const CITIES = ['João Pessoa', 'Cabedelo', 'Santa Rita'];

function AreaDialog({
  area,
  onSave,
  onClose,
  isPending,
}: {
  area: DeliveryAreaResponse | null;
  onSave: (data: { neighborhood: string; city: string; fee: number }) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [neighborhood, setNeighborhood] = useState(area?.neighborhood ?? '');
  const [city, setCity] = useState(area?.city ?? 'João Pessoa');
  const [fee, setFee] = useState(area?.fee?.toString() ?? '');

  useEffect(() => {
    setNeighborhood(area?.neighborhood ?? '');
    setCity(area?.city ?? 'João Pessoa');
    setFee(area?.fee?.toString() ?? '');
  }, [area]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(fee);
    if (!neighborhood.trim() || isNaN(parsed) || parsed < 0) return;
    onSave({ neighborhood: neighborhood.trim(), city, fee: parsed });
  }

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent open className="max-w-md border-[#E8DDD0] bg-white p-0">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-[#E8DDD0] px-6 pb-4 pt-6">
            <DialogTitle className="font-display text-lg font-semibold text-[#3D2B1F]">
              {area ? 'Editar área' : 'Nova área de entrega'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Bairro</label>
              <input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Nome do bairro"
                className="h-11 w-full rounded-xl border border-[#E8DDD0] px-3 text-sm text-[#3D2B1F] outline-none focus:border-[#D4C8BA] focus:ring-2 focus:ring-[#E8DDD0]/50"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Cidade</label>
              <CustomSelect
                value={city}
                onChange={setCity}
                options={CITIES.map((c) => ({ value: c, label: c }))}
                placeholder="Selecionar cidade"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Taxa (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="0.00"
                className="h-11 w-full rounded-xl border border-[#E8DDD0] px-3 text-sm text-[#3D2B1F] outline-none focus:border-[#D4C8BA] focus:ring-2 focus:ring-[#E8DDD0]/50"
                required
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[#E8DDD0] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E8DDD0] px-4 py-2.5 text-sm font-semibold text-[#8B7355] transition-colors hover:bg-[#FAF6F1]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-xl bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {area ? 'Salvar' : 'Criar'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeliveryAreasClient() {
  const {
    areas,
    isLoading,
    search,
    setSearch,
    showDialog,
    setShowDialog,
    editingArea,
    openCreate,
    openEdit,
    toggleActive,
    createMutation,
    updateMutation,
  } = useDeliveryAreasPage();

  function handleSave(data: { neighborhood: string; city: string; fee: number }) {
    if (editingArea) {
      updateMutation.mutate({ id: editingArea.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#3D2B1F]">Áreas de Entrega</h1>
          <p className="text-sm text-[#8B7355]">
            {areas.length} {areas.length === 1 ? 'área' : 'áreas'} cadastradas
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Adicionar bairro
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A0]" />
        <input
          type="text"
          placeholder="Buscar bairro ou cidade..."
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
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355]">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#8B7355] hidden sm:table-cell">Cidade</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#8B7355]">Taxa</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[#8B7355]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DDD0]">
              {areas.map((area) => (
                <tr
                  key={area.id}
                  className={`transition-colors hover:bg-[#FAF6F1] ${!area.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-terra-400 shrink-0" />
                      <div>
                        <span className="font-medium text-[#3D2B1F]">{area.neighborhood}</span>
                        <span className="text-[#8B7355] sm:hidden ml-1 text-xs">({area.city})</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#8B7355] hidden sm:table-cell">{area.city}</td>
                  <td className="px-4 py-3 text-right font-semibold text-terra-600">{formatCurrency(area.fee)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(area)}
                        className="rounded-lg p-1.5 text-[#8B7355] transition-colors hover:bg-[#FAF6F1] hover:text-[#3D2B1F]"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(area)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          area.isActive
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-[#C4B5A0] hover:bg-[#FAF6F1]'
                        }`}
                        title={area.isActive ? 'Desativar' : 'Ativar'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {areas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#C4B5A0]">
                    {search ? 'Nenhuma área encontrada' : 'Nenhuma área cadastrada'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showDialog && (
        <AreaDialog
          area={editingArea}
          onSave={handleSave}
          onClose={() => { setShowDialog(false); }}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
