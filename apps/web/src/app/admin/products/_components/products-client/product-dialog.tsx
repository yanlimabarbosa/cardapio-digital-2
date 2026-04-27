'use client';

import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, ImagePlus, X } from 'lucide-react';
import type { AdminCategoryOption } from '@/types/admin';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  imageUrl: string;
  isCompound: boolean;
  isRedeemable: boolean;
  redemptionCost: string;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  form: ProductForm;
  setForm: (form: ProductForm) => void;
  categories: AdminCategoryOption[] | undefined;
  imagePreview: string | null;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onSave: () => void;
  isPending: boolean;
  uploading: boolean;
}

export function ProductDialog({
  open,
  onOpenChange,
  isEditing,
  form,
  setForm,
  categories,
  imagePreview,
  onImageSelect,
  onClearImage,
  onSave,
  isPending,
  uploading,
}: ProductDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} className="border-[#EAD8A0] bg-[#FBF6E9]">
        <DialogHeader className="border-b border-[#EAD8A0] pb-4 px-6 pt-6">
          <DialogTitle className="font-display text-lg font-semibold text-[#2A1508]">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Nome</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-11 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Descrição</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="h-11 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Preço (R$)</label>
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="h-11 w-32 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Categoria</label>
            <CustomSelect
              value={form.categoryId}
              onChange={(v) => setForm({ ...form, categoryId: v })}
              options={(categories ?? []).map((cat) => ({ value: cat.id, label: cat.name }))}
              placeholder="Selecionar categoria"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Imagem</label>
            {imagePreview ? (
              <div className="relative mt-2 inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-full rounded-xl border border-[#EAD8A0] object-cover"
                />
                <button
                  type="button"
                  onClick={onClearImage}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md transition-colors hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="mt-2 flex h-32 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#EAD8A0] bg-[#FDF7E3] transition-colors hover:border-[#6B3E14]/40 hover:bg-[#6B3E14]/5">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onImageSelect}
                />
                <div className="flex flex-col items-center gap-2">
                  <ImagePlus className="h-8 w-8 text-[#EAD8A0]" />
                  <span className="text-xs text-[#8A6F40]">Clique para enviar</span>
                </div>
              </label>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Prato Composto</label>
            <div className="space-y-2 rounded-xl border border-[#EAD8A0] bg-[#FDF7E3] p-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCompound}
                  onChange={(e) => setForm({ ...form, isCompound: e.target.checked })}
                  className="h-4 w-4 rounded border-[#EAD8A0] text-[#6B3E14] focus:ring-[#6B3E14]"
                />
                <span className="text-sm font-medium text-[#2A1508]">Produto com grupos de opções</span>
              </label>
              {form.isCompound && (
                <p className="text-xs text-[#8A6F40]">Configure os grupos de opções na área expandida do produto após salvar.</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Fidelidade</label>
            <div className="space-y-3 rounded-xl border border-[#EAD8A0] bg-[#FDF7E3] p-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRedeemable}
                  onChange={(e) => setForm({ ...form, isRedeemable: e.target.checked, redemptionCost: e.target.checked ? form.redemptionCost : '0' })}
                  className="h-4 w-4 rounded border-[#EAD8A0] text-[#6B3E14] focus:ring-[#6B3E14]"
                />
                <span className="text-sm font-medium text-[#2A1508]">Resgatavel com pontos</span>
              </label>
              {form.isRedeemable && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#8A6F40]">Custo em pontos</label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.redemptionCost}
                    onChange={(e) => setForm({ ...form, redemptionCost: e.target.value })}
                    className="h-11 w-32 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-[#EAD8A0] px-6 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-[#EAD8A0] px-4 py-2.5 text-sm font-semibold text-[#8A6F40] transition-colors hover:bg-[#FDF7E3]"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={isPending || uploading || !form.name || !form.price}
            className="rounded-xl bg-[#6B3E14] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5C2F10] disabled:opacity-60"
          >
            {isPending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
