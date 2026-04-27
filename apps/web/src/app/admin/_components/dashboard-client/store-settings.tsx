'use client';

import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ImagePlus, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { adminFetch } from '@/lib/admin-api';
import type { StoreSettingsData } from '@/types/admin';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type StoreMode = 'schedule' | 'force_open' | 'force_close';

interface StoreSettingsProps {
  storeSettings: StoreSettingsData;
  storeStatus: { open: boolean; reason?: string } | undefined;
  storeMode: StoreMode;
  onSetMode: (mode: StoreMode) => void;
  onUpdateSettings: (data: Partial<StoreSettingsData>) => void;
  onToggleDay: (day: number) => void;
}

export function StoreSettings({
  storeSettings,
  storeStatus,
  storeMode,
  onSetMode,
  onUpdateSettings,
  onToggleDay,
}: StoreSettingsProps) {
  const token = useAuthStore((s) => s.token);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const { url } = await adminFetch<{ url: string }>('/api/admin/upload', token, {
      method: 'POST',
      body: formData,
    });
    onUpdateSettings({ bannerUrl: url });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', damping: 24, stiffness: 300 }}
      className="rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] p-6 shadow-[0_0_8px_rgba(60,40,20,0.12)]"
    >
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#7A4F1C]">
        Controle da Loja
      </h2>

      {storeStatus?.open ? (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold text-emerald-700">
            {storeMode === 'force_open'
              ? 'Loja aberta manualmente (fora do horário)'
              : 'Loja aberta para pedidos'}
          </span>
        </div>
      ) : (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-red-700">
            {storeMode === 'force_close'
              ? 'Loja manualmente fechada'
              : `Loja fechada — ${storeStatus?.reason || 'fora do horário'}`}
          </span>
        </div>
      )}

      <div className="mb-5">
        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">
          Modo
        </label>
        <div className="inline-flex rounded-xl border border-[#EAD8A0] p-1">
          <button
            onClick={() => onSetMode('schedule')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-bold transition-colors',
              storeMode === 'schedule'
                ? 'bg-[#6B3E14] text-white'
                : 'text-[#8A6F40] hover:bg-[#FDF7E3]',
            )}
          >
            Automático
          </button>
          <button
            onClick={() => onSetMode('force_open')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-bold transition-colors',
              storeMode === 'force_open'
                ? 'bg-emerald-500 text-white'
                : 'text-[#8A6F40] hover:bg-[#FDF7E3]',
            )}
          >
            Forçar Aberta
          </button>
          <button
            onClick={() => onSetMode('force_close')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-bold transition-colors',
              storeMode === 'force_close'
                ? 'bg-red-500 text-white'
                : 'text-[#8A6F40] hover:bg-[#FDF7E3]',
            )}
          >
            Forçar Fechada
          </button>
        </div>
      </div>

      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">
        Horário de Funcionamento
      </label>
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8A6F40]">
            Abre às
          </label>
          <Input
            type="time"
            value={storeSettings.openingTime}
            onChange={(e) => onUpdateSettings({ openingTime: e.target.value })}
            className="h-11 w-32 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8A6F40]">
            Fecha às
          </label>
          <Input
            type="time"
            value={storeSettings.closingTime}
            onChange={(e) => onUpdateSettings({ closingTime: e.target.value })}
            className="h-11 w-32 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
          />
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">
          Pontos por R$1 gasto
        </label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={storeSettings.pointsPerReal ?? 0}
          onChange={(e) => onUpdateSettings({ pointsPerReal: parseFloat(e.target.value) || 0 })}
          className="h-11 w-32 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
        />
        <p className="mt-1 text-[10px] text-[#8A6F40]">
          Ex: 1.00 = 1 ponto a cada R$1 gasto. 0 = desativado.
        </p>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#8A6F40]">
          Dias abertos
        </label>
        <div className="flex gap-2">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-colors',
                storeSettings.openDays.includes(i)
                  ? 'bg-[#6B3E14] text-white'
                  : 'border-2 border-[#EAD8A0] text-[#8A6F40] hover:border-[#6B3E14]/30',
              )}
              onClick={() => onToggleDay(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Banner */}
      <div className="mt-8 border-t border-[#EAD8A0] pt-6">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#7A4F1C]">
          Aparência
        </h3>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8A6F40]">
            Banner do Cardápio
          </label>
          {storeSettings.bannerUrl ? (
            <div className="relative w-full overflow-hidden rounded-xl border border-[#EAD8A0]">
              <img
                src={storeSettings.bannerUrl}
                alt="Banner"
                className="h-32 w-full object-cover"
              />
              <button
                onClick={() => onUpdateSettings({ bannerUrl: '' })}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="flex h-24 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#EAD8A0] text-sm text-[#8A6F40] transition-colors hover:border-[#6B3E14]/40 hover:text-[#6B3E14]"
            >
              <ImagePlus className="h-5 w-5" />
              Enviar banner
            </button>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerUpload}
          />
          <p className="mt-1 text-[10px] text-[#8A6F40]">Aparece abaixo do cabeçalho no cardápio. Recomendado: 1200×400px.</p>
        </div>
      </div>

      {/* Receipt settings */}
      <div className="mt-8 border-t border-[#EAD8A0] pt-6">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#7A4F1C]">
          Dados do Comprovante
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8A6F40]">
              CNPJ
            </label>
            <Input
              type="text"
              placeholder="XX.XXX.XXX/XXXX-XX"
              value={storeSettings.receiptCnpj ?? ''}
              onChange={(e) => onUpdateSettings({ receiptCnpj: e.target.value })}
              className="h-11 w-64 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8A6F40]">
              Endereco
            </label>
            <textarea
              placeholder="Endereco completo do restaurante"
              value={storeSettings.receiptAddress ?? ''}
              onChange={(e) => onUpdateSettings({ receiptAddress: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-[#EAD8A0] bg-[#FBF6E9] px-3 py-2 text-sm text-[#2A1508] outline-none placeholder:text-[#B89D5F] focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8A6F40]">
              Telefone
            </label>
            <Input
              type="text"
              placeholder="(XX) XXXXX-XXXX"
              value={storeSettings.receiptPhone ?? ''}
              onChange={(e) => onUpdateSettings({ receiptPhone: e.target.value })}
              className="h-11 w-52 rounded-xl border-[#EAD8A0] bg-[#FBF6E9]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8A6F40]">
              Mensagem de rodape
            </label>
            <textarea
              placeholder="Obrigado pela preferencia!"
              value={storeSettings.receiptFooter ?? ''}
              onChange={(e) => onUpdateSettings({ receiptFooter: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-[#EAD8A0] bg-[#FBF6E9] px-3 py-2 text-sm text-[#2A1508] outline-none placeholder:text-[#B89D5F] focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
