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

const dialogInputClass =
  'h-11 rounded-xl border-[#D8C5B2] bg-white text-[#3D2B1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(61,43,31,0.04)] placeholder:text-[#8B7355]/50 focus-visible:ring-[#A0603A]/20 focus-visible:ring-offset-0';
const uploadDropzoneClass =
  'mt-2 flex h-32 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#D8C5B2] bg-white shadow-[0_1px_2px_rgba(61,43,31,0.04)] transition-colors hover:border-[#A0603A]/45 hover:bg-[#FFFCF8]';

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
      <DialogContent open={open} className="border-[#E8DDD0] bg-[#FFFCF8]">
        <DialogHeader className="border-b border-[#E8DDD0] pb-4 px-6 pt-6">
          <DialogTitle className="font-display text-lg font-semibold text-[#3D2B1F]">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">Nome</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={dialogInputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">Descrição</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={dialogInputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">Preço (R$)</label>
            <Input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={`${dialogInputClass} w-32`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">Categoria</label>
            <CustomSelect
              value={form.categoryId}
              onChange={(v) => setForm({ ...form, categoryId: v })}
              options={(categories ?? []).map((cat) => ({ value: cat.id, label: cat.name }))}
              placeholder="Selecionar categoria"
              className="h-11 rounded-xl border-[#D8C5B2] bg-white text-[#3D2B1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(61,43,31,0.04)] focus:ring-[#A0603A]/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">Imagem</label>
            {imagePreview ? (
              <div className="relative mt-2 inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-full rounded-xl border border-[#E8DDD0] object-cover"
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
              <label className={uploadDropzoneClass}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onImageSelect}
                />
                <div className="flex flex-col items-center gap-2">
                  <ImagePlus className="h-8 w-8 text-[#E8DDD0]" />
                  <span className="text-xs text-[#8B7355]">Clique para enviar</span>
                </div>
              </label>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">Prato Composto</label>
            <div className="space-y-2 rounded-xl border border-[#E8DDD0] bg-[#FAF6F1] p-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCompound}
                  onChange={(e) => setForm({ ...form, isCompound: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E8DDD0] text-[#A0603A] focus:ring-[#A0603A]"
                />
                <span className="text-sm font-medium text-[#3D2B1F]">Produto com grupos de opções</span>
              </label>
              {form.isCompound && (
                <p className="text-xs text-[#8B7355]">Configure os grupos de opções na área expandida do produto após salvar.</p>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">Fidelidade</label>
            <div className="space-y-3 rounded-xl border border-[#E8DDD0] bg-[#FAF6F1] p-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRedeemable}
                  onChange={(e) => setForm({ ...form, isRedeemable: e.target.checked, redemptionCost: e.target.checked ? form.redemptionCost : '0' })}
                  className="h-4 w-4 rounded border-[#E8DDD0] text-[#A0603A] focus:ring-[#A0603A]"
                />
                <span className="text-sm font-medium text-[#3D2B1F]">Resgatavel com pontos</span>
              </label>
              {form.isRedeemable && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#8B7355]">Custo em pontos</label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.redemptionCost}
                    onChange={(e) => setForm({ ...form, redemptionCost: e.target.value })}
                    className={`${dialogInputClass} w-32`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-[#E8DDD0] px-6 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-[#E8DDD0] px-4 py-2.5 text-sm font-semibold text-[#8B7355] transition-colors hover:bg-[#FAF6F1]"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={isPending || uploading || !form.name || !form.price}
            className="rounded-xl bg-[#A0603A] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#8b4c2a] disabled:opacity-60"
          >
            {isPending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
