'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  isPending = false,
  onConfirm,
  onOpenChange,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} className="max-w-md border-[#E8DDD0] bg-[#FFFCF8] p-0">
        <DialogHeader className="border-b border-[#E8DDD0] px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-lg font-semibold text-[#3D2B1F]">
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm leading-6 text-[#8B7355]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-t border-[#E8DDD0] px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-xl border border-[#E8DDD0] px-4 py-2.5 text-sm font-semibold text-[#8B7355] transition-colors hover:bg-[#FAF6F1] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
