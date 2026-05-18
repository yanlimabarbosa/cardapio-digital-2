'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Power, Search, Loader2, ChevronUp, ChevronDown, X, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import { useFeaturedPage } from './use-featured-page';
import type { AdminProduct } from '@/types/admin';
import { WeeklyScheduleEditor } from '@/components/admin/weekly-schedule-editor';
import type { WeeklySchedule } from '@cardapio/shared';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const dialogControlClass =
  'h-11 w-full rounded-xl border border-[#D8C5B2] bg-white px-3 text-sm text-[#3D2B1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(61,43,31,0.04)] outline-none placeholder:text-[#8B7355]/50 focus:border-[#A0603A]/45 focus:ring-2 focus:ring-[#A0603A]/20';

function SectionDialog({
  section,
  onSave,
  onClose,
  isPending,
}: {
  section: { label: string; emoji: string; availabilitySchedule?: WeeklySchedule | null } | null;
  onSave: (data: { label: string; emoji: string; availabilitySchedule: WeeklySchedule | null }) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [label, setLabel] = useState(section?.label ?? '');
  const [emoji, setEmoji] = useState(section?.emoji ?? '');
  const [availabilitySchedule, setAvailabilitySchedule] = useState<WeeklySchedule | null>(section?.availabilitySchedule ?? null);

  useEffect(() => {
    setLabel(section?.label ?? '');
    setEmoji(section?.emoji ?? '');
    setAvailabilitySchedule(section?.availabilitySchedule ?? null);
  }, [section]);

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent open className="max-w-2xl border-[#E8DDD0] bg-[#FFFCF8] p-0">
        <form
          onSubmit={(e) => { e.preventDefault(); if (label.trim()) onSave({ label: label.trim(), emoji, availabilitySchedule }); }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="shrink-0 border-b border-[#E8DDD0] px-6 pb-4 pt-6">
            <DialogTitle className="font-display text-lg font-semibold text-[#3D2B1F]">
              {section ? 'Editar seção' : 'Nova seção'}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Nome da seção</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Destaques, Mais Pedidos..."
                className={dialogControlClass}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Emoji</label>
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="✨ 🔥 🆕 ⭐"
                className={dialogControlClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Disponibilidade</label>
              <WeeklyScheduleEditor
                value={availabilitySchedule}
                allowUnrestricted
                unrestrictedLabel="Disponível em todo horário de funcionamento da loja"
                onChange={setAvailabilitySchedule}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-[#E8DDD0] px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#E8DDD0] px-4 py-2.5 text-sm font-semibold text-[#8B7355] transition-colors hover:bg-[#FAF6F1]">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="flex items-center justify-center gap-2 rounded-xl bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 disabled:opacity-50">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {section ? 'Salvar' : 'Criar'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductsManager({
  sectionProducts,
  availableProducts,
  onSave,
  onClose,
  isPending,
}: {
  sectionProducts: Array<{ id: string; name: string; price: number; imageUrl?: string }>;
  availableProducts: AdminProduct[];
  onSave: (productIds: string[]) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<Array<{ id: string; name: string; price: number; imageUrl?: string }>>(sectionProducts);
  const [search, setSearch] = useState('');

  const selectedIds = new Set(selected.map((p) => p.id));
  const filtered = availableProducts.filter(
    (p) => !selectedIds.has(p.id) && (p.name.toLowerCase().includes(search.toLowerCase())),
  );

  function addProduct(p: AdminProduct) {
    setSelected([...selected, { id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl }]);
  }

  function removeProduct(id: string) {
    setSelected(selected.filter((p) => p.id !== id));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const arr = [...selected];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    setSelected(arr);
  }

  function moveDown(i: number) {
    if (i >= selected.length - 1) return;
    const arr = [...selected];
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    setSelected(arr);
  }

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent open className="max-w-2xl border-[#E8DDD0] bg-[#FFFCF8] p-0">
        <DialogHeader className="shrink-0 border-b border-[#E8DDD0] px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-lg font-semibold text-[#3D2B1F]">Gerenciar produtos</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 overscroll-contain [-webkit-overflow-scrolling:touch]">
          {selected.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8B7355]">Produtos na seção ({selected.length})</h3>
              <div className="space-y-1.5">
                {selected.map((p, i) => {
                  const imgSrc = getImageUrl(p.imageUrl);
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg border border-[#E8DDD0] bg-[#FFFCF8] p-2">
                      <div className="flex flex-col">
                        <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className="text-[#C4B5A0] hover:text-[#8B7355] disabled:opacity-20">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => moveDown(i)} disabled={i >= selected.length - 1} className="text-[#C4B5A0] hover:text-[#8B7355] disabled:opacity-20">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {imgSrc ? (
                        <img src={imgSrc} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-terra-100 text-sm opacity-40">🫓</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#3D2B1F]">{p.name}</p>
                        <p className="text-xs text-terra-500">{formatCurrency(p.price)}</p>
                      </div>
                      <button type="button" onClick={() => removeProduct(p.id)} className="shrink-0 rounded-md p-1.5 text-[#C4B5A0] hover:bg-red-50 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8B7355]">Adicionar produtos</h3>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A0]" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#D8C5B2] bg-white pl-9 pr-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(61,43,31,0.04)] outline-none placeholder:text-[#8B7355]/50 focus:border-[#A0603A]/45"
              />
            </div>
            <div className="max-h-48 overflow-auto space-y-1">
              {filtered.map((p) => {
                const imgSrc = getImageUrl(p.imageUrl);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-[#FAF6F1]"
                  >
                    {imgSrc ? (
                      <img src={imgSrc} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-terra-100 text-xs opacity-40">🫓</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#3D2B1F]">{p.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-terra-600">{formatCurrency(p.price)}</span>
                    <Plus className="h-4 w-4 text-terra-400" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="py-4 text-center text-xs text-[#C4B5A0]">
                  {search ? 'Nenhum produto encontrado' : 'Todos os produtos já estão na seção'}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-[#E8DDD0] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#E8DDD0] px-4 py-2.5 text-sm font-semibold text-[#8B7355] transition-colors hover:bg-[#FAF6F1]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(selected.map((p) => p.id))}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Check className="h-4 w-4" />
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FeaturedClient() {
  const {
    sections,
    sectionsLoading,
    availableProducts,
    showSectionDialog,
    setShowSectionDialog,
    editingSection,
    openCreateSection,
    openEditSection,
    managingProducts,
    setManagingProducts,
    createMutation,
    updateMutation,
    deleteMutation,
    reorderMutation,
    setProductsMutation,
  } = useFeaturedPage();
  const [deleteSection, setDeleteSection] = useState<{ id: string; label: string } | null>(null);

  function handleSaveSection(data: { label: string; emoji: string; availabilitySchedule: WeeklySchedule | null }) {
    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleMoveSection(id: string, direction: 'up' | 'down') {
    const idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const arr = sections.map((s) => s.id);
    if (direction === 'up' && idx > 0) {
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    } else if (direction === 'down' && idx < arr.length - 1) {
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    }
    reorderMutation.mutate(arr);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#3D2B1F]">Seções do Cardápio</h1>
          <p className="text-sm text-[#8B7355]">Carrosséis acima das categorias na página inicial</p>
        </div>
        <button
          onClick={openCreateSection}
          className="inline-flex items-center gap-2 rounded-xl bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Nova seção
        </button>
      </div>

      {sectionsLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-terra-400" />
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E8DDD0] p-12 text-center">
          <p className="text-[#8B7355]">Nenhuma seção criada</p>
          <p className="mt-1 text-sm text-[#C4B5A0]">Crie seções para destacar produtos no cardápio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className={`overflow-hidden rounded-xl border border-[#E8DDD0] bg-white transition-opacity ${!section.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3 p-4">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveSection(section.id, 'up')}
                    disabled={idx === 0}
                    className="text-[#C4B5A0] hover:text-[#8B7355] disabled:opacity-20"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMoveSection(section.id, 'down')}
                    disabled={idx === sections.length - 1}
                    className="text-[#C4B5A0] hover:text-[#8B7355] disabled:opacity-20"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAF6F1] text-lg">
                  {section.emoji || '📋'}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#3D2B1F]">{section.label}</h3>
                  <p className="text-xs text-[#8B7355]">{section.productCount} {section.productCount === 1 ? 'produto' : 'produtos'}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setManagingProducts(section)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-terra-600 transition-colors hover:bg-[#FAF6F1]"
                  >
                    Produtos
                  </button>
                  <Tooltip label="Editar seção">
                    <button
                      onClick={() => openEditSection(section)}
                      className="rounded-lg p-1.5 text-[#8B7355] transition-colors hover:bg-[#FAF6F1]"
                      aria-label="Editar seção"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip label={section.isActive ? 'Desativar seção' : 'Ativar seção'}>
                    <button
                      onClick={() => updateMutation.mutate({ id: section.id, isActive: !section.isActive })}
                      className={`rounded-lg p-1.5 transition-colors ${section.isActive ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-500 hover:bg-slate-100'}`}
                      aria-label={section.isActive ? 'Desativar seção' : 'Ativar seção'}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </Tooltip>
                  <Tooltip label="Excluir seção">
                    <button
                      onClick={() => setDeleteSection({ id: section.id, label: section.label })}
                      className="rounded-lg p-1.5 text-[#C4B5A0] transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label="Excluir seção"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {section.products.length > 0 && (
                <div className="flex gap-2 overflow-x-auto border-t border-[#E8DDD0] bg-[#FAF6F1] p-3">
                  {section.products.map((p) => {
                    const imgSrc = getImageUrl(p.imageUrl);
                    return (
                      <div key={p.id} className="flex shrink-0 items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs">
                        {imgSrc ? (
                          <img src={imgSrc} alt="" className="h-6 w-6 rounded object-cover" />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-terra-100 text-[10px] opacity-40">🫓</div>
                        )}
                        <span className="max-w-[100px] truncate text-[#3D2B1F]">{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showSectionDialog && (
        <SectionDialog
          section={editingSection}
          onSave={handleSaveSection}
          onClose={() => setShowSectionDialog(false)}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {managingProducts && (
        <ProductsManager
          sectionProducts={managingProducts.products}
          availableProducts={availableProducts}
          onSave={(productIds) => setProductsMutation.mutate({ sectionId: managingProducts.id, productIds })}
          onClose={() => setManagingProducts(null)}
          isPending={setProductsMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={deleteSection !== null}
        onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteSection(null); }}
        title="Excluir secao?"
        description={
          deleteSection
            ? `Voce esta prestes a excluir "${deleteSection.label}". Essa acao nao pode ser desfeita.`
            : ''
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteSection) return;
          deleteMutation.mutate(deleteSection.id, {
            onSuccess: () => setDeleteSection(null),
          });
        }}
      />
    </div>
  );
}
