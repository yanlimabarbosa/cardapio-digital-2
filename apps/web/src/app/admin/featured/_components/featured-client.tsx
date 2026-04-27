'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Power, Search, Loader2, ChevronUp, ChevronDown, X, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import { useFeaturedPage } from './use-featured-page';
import type { AdminProduct } from '@/types/admin';

function SectionDialog({
  section,
  onSave,
  onClose,
  isPending,
}: {
  section: { label: string; emoji: string } | null;
  onSave: (data: { label: string; emoji: string }) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [label, setLabel] = useState(section?.label ?? '');
  const [emoji, setEmoji] = useState(section?.emoji ?? '');

  useEffect(() => {
    setLabel(section?.label ?? '');
    setEmoji(section?.emoji ?? '');
  }, [section]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={(e) => { e.preventDefault(); if (label.trim()) onSave({ label: label.trim(), emoji }); }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4"
      >
        <h2 className="font-display text-lg font-semibold text-[#2A1508]">
          {section ? 'Editar seção' : 'Nova seção'}
        </h2>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#8A6F40]">Nome da seção</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Destaques, Mais Pedidos..."
            className="h-10 w-full rounded-lg border border-[#EAD8A0] px-3 text-sm text-[#2A1508] outline-none focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50"
            required
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#8A6F40]">Emoji</label>
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="✨ 🔥 🆕 ⭐"
            className="h-10 w-full rounded-lg border border-[#EAD8A0] px-3 text-sm text-[#2A1508] outline-none focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[#EAD8A0] px-4 py-2.5 text-sm font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 disabled:opacity-50">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {section ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-2xl max-h-[80vh] flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EAD8A0] px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-[#2A1508]">Gerenciar produtos</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-[#8A6F40] hover:bg-[#FDF7E3]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {selected.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7A4F1C]">Produtos na seção ({selected.length})</h3>
              <div className="space-y-1.5">
                {selected.map((p, i) => {
                  const imgSrc = getImageUrl(p.imageUrl);
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg border border-[#EAD8A0] bg-[#FBF6E9] p-2">
                      <div className="flex flex-col">
                        <button type="button" onClick={() => moveUp(i)} disabled={i === 0} className="text-[#B89D5F] hover:text-[#8A6F40] disabled:opacity-20">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => moveDown(i)} disabled={i >= selected.length - 1} className="text-[#B89D5F] hover:text-[#8A6F40] disabled:opacity-20">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {imgSrc ? (
                        <img src={imgSrc} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-terra-100 text-sm opacity-40">🫓</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#2A1508]">{p.name}</p>
                        <p className="text-xs text-terra-500">{formatCurrency(p.price)}</p>
                      </div>
                      <button type="button" onClick={() => removeProduct(p.id)} className="shrink-0 rounded-md p-1.5 text-[#B89D5F] hover:bg-red-50 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#7A4F1C]">Adicionar produtos</h3>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B89D5F]" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#EAD8A0] bg-white pl-9 pr-4 text-sm outline-none placeholder:text-[#B89D5F] focus:border-[#D4B878]"
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
                    className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-[#FDF7E3]"
                  >
                    {imgSrc ? (
                      <img src={imgSrc} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-terra-100 text-xs opacity-40">🫓</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[#2A1508]">{p.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-terra-600">{formatCurrency(p.price)}</span>
                    <Plus className="h-4 w-4 text-terra-400" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="py-4 text-center text-xs text-[#B89D5F]">
                  {search ? 'Nenhum produto encontrado' : 'Todos os produtos já estão na seção'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#EAD8A0] px-6 py-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[#EAD8A0] px-4 py-2.5 text-sm font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(selected.map((p) => p.id))}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Check className="h-4 w-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
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

  function handleSaveSection(data: { label: string; emoji: string }) {
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
          <h1 className="font-display text-2xl font-bold text-[#2A1508]">Seções do Cardápio</h1>
          <p className="text-sm text-[#8A6F40]">Carrosséis acima das categorias na página inicial</p>
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
        <div className="rounded-xl border border-dashed border-[#EAD8A0] p-12 text-center">
          <p className="text-[#8A6F40]">Nenhuma seção criada</p>
          <p className="mt-1 text-sm text-[#B89D5F]">Crie seções para destacar produtos no cardápio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className={`overflow-hidden rounded-xl border border-[#EAD8A0] bg-white transition-opacity ${!section.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3 p-4">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveSection(section.id, 'up')}
                    disabled={idx === 0}
                    className="text-[#B89D5F] hover:text-[#8A6F40] disabled:opacity-20"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMoveSection(section.id, 'down')}
                    disabled={idx === sections.length - 1}
                    className="text-[#B89D5F] hover:text-[#8A6F40] disabled:opacity-20"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FDF7E3] text-lg">
                  {section.emoji || '📋'}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#2A1508]">{section.label}</h3>
                  <p className="text-xs text-[#8A6F40]">{section.productCount} {section.productCount === 1 ? 'produto' : 'produtos'}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setManagingProducts(section)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-terra-600 transition-colors hover:bg-[#FDF7E3]"
                  >
                    Produtos
                  </button>
                  <button
                    onClick={() => openEditSection(section)}
                    className="rounded-lg p-1.5 text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: section.id, isActive: !section.isActive })}
                    className={`rounded-lg p-1.5 transition-colors ${section.isActive ? 'text-green-600 hover:bg-green-50' : 'text-[#B89D5F] hover:bg-[#FDF7E3]'}`}
                    title={section.isActive ? 'Desativar' : 'Ativar'}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Excluir seção?')) deleteMutation.mutate(section.id); }}
                    className="rounded-lg p-1.5 text-[#B89D5F] transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {section.products.length > 0 && (
                <div className="flex gap-2 overflow-x-auto border-t border-[#EAD8A0] bg-[#FDF7E3] p-3">
                  {section.products.map((p) => {
                    const imgSrc = getImageUrl(p.imageUrl);
                    return (
                      <div key={p.id} className="flex shrink-0 items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs">
                        {imgSrc ? (
                          <img src={imgSrc} alt="" className="h-6 w-6 rounded object-cover" />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded bg-terra-100 text-[10px] opacity-40">🫓</div>
                        )}
                        <span className="max-w-[100px] truncate text-[#2A1508]">{p.name}</span>
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
    </div>
  );
}
