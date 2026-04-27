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

interface OptionGroupForm {
  name: string;
  minSelections: string;
  maxSelections: string;
}

interface OptionGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  form: OptionGroupForm;
  setForm: (form: OptionGroupForm) => void;
  onSave: () => void;
  isPending: boolean;
}

export function OptionGroupDialog({
  open,
  onOpenChange,
  isEditing,
  form,
  setForm,
  onSave,
  isPending,
}: OptionGroupDialogProps) {
  const min = parseInt(form.minSelections, 10) || 0;
  const max = parseInt(form.maxSelections, 10) || 1;
  const isValid = form.name && max >= 1 && min <= max;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} className="border-[#EAD8A0] bg-[#FBF6E9]">
        <DialogHeader className="border-b border-[#EAD8A0] pb-4 px-6 pt-6">
          <DialogTitle className="font-display text-lg font-semibold text-[#2A1508]">
            {isEditing ? 'Editar Grupo de Opções' : 'Novo Grupo de Opções'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Nome do grupo</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Proteínas, Acompanhamentos..."
              className="h-11 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Mín. seleções</label>
              <Input
                type="number"
                min="0"
                value={form.minSelections}
                onChange={(e) => setForm({ ...form, minSelections: e.target.value })}
                className="h-11 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
              />
              <p className="mt-1 text-xs text-[#8A6F40]">{min >= 1 ? 'Obrigatório' : 'Opcional'}</p>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">Máx. seleções</label>
              <Input
                type="number"
                min="1"
                value={form.maxSelections}
                onChange={(e) => setForm({ ...form, maxSelections: e.target.value })}
                className="h-11 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
              />
              <p className="mt-1 text-xs text-[#8A6F40]">{max === 1 ? 'Escolha única' : `Até ${max} opções`}</p>
            </div>
          </div>
          {min > max && (
            <p className="text-xs font-medium text-red-500">Mínimo não pode ser maior que máximo</p>
          )}
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
            disabled={isPending || !isValid}
            className="rounded-xl bg-[#6B3E14] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5C2F10] disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
