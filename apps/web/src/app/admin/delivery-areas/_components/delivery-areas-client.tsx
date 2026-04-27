'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Power, Search, MapPin, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <h2 className="font-display text-lg font-semibold text-[#2A1508]">
          {area ? 'Editar área' : 'Nova área de entrega'}
        </h2>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#8A6F40]">Bairro</label>
          <input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            placeholder="Nome do bairro"
            className="h-10 w-full rounded-lg border border-[#EAD8A0] px-3 text-sm text-[#2A1508] outline-none focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#8A6F40]">Cidade</label>
          <CustomSelect
            value={city}
            onChange={setCity}
            options={CITIES.map((c) => ({ value: c, label: c }))}
            placeholder="Selecionar cidade"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[#8A6F40]">Taxa (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0.00"
            className="h-10 w-full rounded-lg border border-[#EAD8A0] px-3 text-sm text-[#2A1508] outline-none focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50"
            required
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#EAD8A0] px-4 py-2.5 text-sm font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {area ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
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
          <h1 className="font-display text-2xl font-bold text-[#2A1508]">Áreas de Entrega</h1>
          <p className="text-sm text-[#8A6F40]">
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
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B89D5F]" />
        <input
          type="text"
          placeholder="Buscar bairro ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-xl border border-[#EAD8A0] bg-white pl-9 pr-4 text-sm text-[#2A1508] outline-none placeholder:text-[#B89D5F] focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50 sm:max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-terra-400" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#EAD8A0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EAD8A0] bg-[#FDF7E3]">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#7A4F1C]">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#7A4F1C] hidden sm:table-cell">Cidade</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-[#7A4F1C]">Taxa</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[#7A4F1C]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAD8A0]">
              {areas.map((area) => (
                <tr
                  key={area.id}
                  className={`transition-colors hover:bg-[#FDF7E3] ${!area.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-terra-400 shrink-0" />
                      <div>
                        <span className="font-medium text-[#2A1508]">{area.neighborhood}</span>
                        <span className="text-[#8A6F40] sm:hidden ml-1 text-xs">({area.city})</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#8A6F40] hidden sm:table-cell">{area.city}</td>
                  <td className="px-4 py-3 text-right font-semibold text-terra-600">{formatCurrency(area.fee)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(area)}
                        className="rounded-lg p-1.5 text-[#8A6F40] transition-colors hover:bg-[#FDF7E3] hover:text-[#2A1508]"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(area)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          area.isActive
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-[#B89D5F] hover:bg-[#FDF7E3]'
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
                  <td colSpan={4} className="px-4 py-8 text-center text-[#B89D5F]">
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
