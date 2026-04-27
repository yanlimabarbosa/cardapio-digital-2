'use client';

import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ExtraForm {
  name: string;
  price: string;
}

interface ExtraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  form: ExtraForm;
  setForm: (form: ExtraForm) => void;
  onSave: () => void;
  isPending: boolean;
}

export function ExtraDialog({
  open,
  onOpenChange,
  isEditing,
  form,
  setForm,
  onSave,
  isPending,
}: ExtraDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} className="border-[#EAD8A0] bg-[#FBF6E9]">
        <DialogHeader className="border-b border-[#EAD8A0] pb-4 px-6 pt-6">
          <DialogTitle className="font-display text-lg font-semibold text-[#2A1508]">
            {isEditing ? 'Editar Adicional' : 'Novo Adicional'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Nome</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            disabled={isPending || !form.name || !form.price}
            className="rounded-xl bg-[#6B3E14] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5C2F10] disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
