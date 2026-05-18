'use client';

import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, ImagePlus, X } from 'lucide-react';

interface ExtraForm {
  name: string;
  price: string;
  imageUrl: string;
}

interface ExtraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  label?: string;
  form: ExtraForm;
  setForm: (form: ExtraForm) => void;
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

export function ExtraDialog({
  open,
  onOpenChange,
  isEditing,
  label = 'Adicional',
  form,
  setForm,
  imagePreview,
  onImageSelect,
  onClearImage,
  onSave,
  isPending,
  uploading,
}: ExtraDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} className="border-[#E8DDD0] bg-[#FFFCF8]">
        <DialogHeader className="border-b border-[#E8DDD0] pb-4 px-6 pt-6">
          <DialogTitle className="font-display text-lg font-semibold text-[#3D2B1F]">
            {isEditing ? `Editar ${label}` : `Novo ${label}`}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">Nome</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
