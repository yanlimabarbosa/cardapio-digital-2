'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { cn, maskCnpj, maskPhone } from '@/lib/utils';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { AdminApiError, adminUpload } from '@/lib/admin-api';
import type { StoreSettingsData } from '@/types/admin';
import { WeeklyScheduleEditor } from '@/components/admin/weekly-schedule-editor';
import { legacyToWeeklySchedule } from '@cardapio/shared';

type StoreMode = 'schedule' | 'force_open' | 'force_close';

interface StoreSettingsProps {
  storeSettings: StoreSettingsData;
  storeStatus: { open: boolean; reason?: string } | undefined;
  storeMode: StoreMode;
  onSetMode: (mode: StoreMode) => void;
  onUpdateSettings: (data: Partial<StoreSettingsData>) => void;
}

const settingsControlClass =
  'rounded-xl border-[#D8C5B2] bg-white text-[#3D2B1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(61,43,31,0.04)] placeholder:text-[#8B7355]/50 focus-visible:ring-[#A0603A]/20 focus-visible:ring-offset-0';
const settingsTextareaClass =
  'w-full rounded-xl border border-[#D8C5B2] bg-white px-3 py-2 text-sm text-[#3D2B1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(61,43,31,0.04)] outline-none placeholder:text-[#8B7355]/50 focus:border-[#A0603A]/45 focus:ring-2 focus:ring-[#A0603A]/20';

export function StoreSettings({
  storeSettings,
  storeStatus,
  storeMode,
  onSetMode,
  onUpdateSettings,
}: StoreSettingsProps) {
  const token = useAuthStore((s) => s.token);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const onUpdateSettingsRef = useRef(onUpdateSettings);
  const [receiptDraft, setReceiptDraft] = useState(() => normalizeReceiptSettings(storeSettings));
  const [savedReceiptSettings, setSavedReceiptSettings] = useState(() => normalizeReceiptSettings(storeSettings));
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const receiptDraftRef = useRef(receiptDraft);

  useEffect(() => {
    onUpdateSettingsRef.current = onUpdateSettings;
  }, [onUpdateSettings]);

  useEffect(() => {
    const nextReceiptSettings = normalizeReceiptSettings(storeSettings);

    if (isSameReceiptSettings(nextReceiptSettings, savedReceiptSettings)) {
      return;
    }

    setSavedReceiptSettings(nextReceiptSettings);
    if (isSameReceiptSettings(receiptDraftRef.current, savedReceiptSettings)) {
      receiptDraftRef.current = nextReceiptSettings;
      setReceiptDraft(nextReceiptSettings);
    }

    if (
      (storeSettings.receiptCnpj ?? '') !== nextReceiptSettings.receiptCnpj ||
      (storeSettings.receiptPhone ?? '') !== nextReceiptSettings.receiptPhone
    ) {
      onUpdateSettingsRef.current({
        receiptCnpj: nextReceiptSettings.receiptCnpj,
        receiptPhone: nextReceiptSettings.receiptPhone,
      });
    }
  }, [
    storeSettings.receiptAddress,
    storeSettings.receiptCnpj,
    storeSettings.receiptFooter,
    storeSettings.receiptPhone,
    savedReceiptSettings,
  ]);

  function updateReceiptDraft(patch: Partial<typeof receiptDraft>) {
    setReceiptDraft((current) => {
      const next = { ...current, ...patch };
      receiptDraftRef.current = next;
      return next;
    });
  }

  function saveReceiptDraft() {
    onUpdateSettingsRef.current(receiptDraftRef.current);
    setSavedReceiptSettings(receiptDraftRef.current);
  }

  function resetReceiptDraft() {
    receiptDraftRef.current = savedReceiptSettings;
    setReceiptDraft(savedReceiptSettings);
  }

  const receiptHasChanges = !isSameReceiptSettings(receiptDraft, savedReceiptSettings);

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerError(null);
    setBannerUploading(true);
    try {
      const { url } = await adminUpload(file, token);
      onUpdateSettings({ bannerUrl: url });
    } catch (error) {
      setBannerError(getBannerUploadErrorMessage(error));
    } finally {
      setBannerUploading(false);
      e.target.value = '';
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: 'spring', damping: 24, stiffness: 300 }}
      className="rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-6 shadow-[0_0_8px_rgba(61,43,31,0.12)]"
    >
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8B7355]">
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
        <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">
          Modo
        </label>
        <div className="inline-flex rounded-xl border border-[#E8DDD0] p-1">
          <button
            onClick={() => onSetMode('schedule')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-bold transition-colors',
              storeMode === 'schedule'
                ? 'bg-[#A0603A] text-white'
                : 'text-[#8B7355] hover:bg-[#FAF6F1]',
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
                : 'text-[#8B7355] hover:bg-[#FAF6F1]',
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
                : 'text-[#8B7355] hover:bg-[#FAF6F1]',
            )}
          >
            Forçar Fechada
          </button>
        </div>
      </div>

      <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">
        Agenda semanal
      </label>
      <WeeklyScheduleEditor
        value={storeSettings.weeklySchedule ?? legacyToWeeklySchedule(storeSettings.openDays, storeSettings.openingTime, storeSettings.closingTime)}
        onChange={(weeklySchedule) => onUpdateSettings({ weeklySchedule })}
      />

      <div className="mt-5">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">
          Pontos por R$1 gasto
        </label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={storeSettings.pointsPerReal ?? 0}
          onChange={(e) => onUpdateSettings({ pointsPerReal: parseFloat(e.target.value) || 0 })}
          className={cn(settingsControlClass, 'h-11 w-32')}
        />
        <p className="mt-1 text-[10px] text-[#8B7355]">
          Ex: 1.00 = 1 ponto a cada R$1 gasto. 0 = desativado.
        </p>
      </div>

      {/* Banner */}
      <div className="mt-8 border-t border-[#E8DDD0] pt-6">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8B7355]">
          Aparência
        </h3>
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
            Banner do Cardápio
          </label>
          {storeSettings.bannerUrl ? (
            <div className="relative w-full overflow-hidden rounded-xl border border-[#E8DDD0]">
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
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading}
              className="flex h-24 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D8C5B2] bg-white text-sm font-bold text-[#5A2D14] shadow-[0_1px_2px_rgba(61,43,31,0.04)] transition-colors hover:border-[#A0603A]/45 hover:bg-[#FFFCF8] hover:text-[#A0603A] disabled:cursor-wait disabled:opacity-60"
            >
              {bannerUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              {bannerUploading ? 'Enviando...' : 'Enviar banner'}
            </button>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerUpload}
          />
          {bannerError && (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700" role="alert">
              {bannerError}
            </p>
          )}
          <p className="mt-1 text-[10px] text-[#8B7355]">Aparece abaixo do cabeçalho no cardápio. Recomendado: 1200×400px.</p>
        </div>
      </div>

      {/* Receipt settings */}
      <div className="mt-8 border-t border-[#E8DDD0] pt-6">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8B7355]">
          Dados do Comprovante
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
              CNPJ
            </label>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="XX.XXX.XXX/XXXX-XX"
              maxLength={18}
              value={receiptDraft.receiptCnpj}
              onChange={(e) =>
                updateReceiptDraft({
                  receiptCnpj: maskCnpj(e.target.value),
                })
              }
              className={cn(settingsControlClass, 'h-11 w-64')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
              Endereco
            </label>
            <textarea
              placeholder="Endereco completo do restaurante"
              value={receiptDraft.receiptAddress}
              onChange={(e) =>
                updateReceiptDraft({
                  receiptAddress: e.target.value,
                })
              }
              rows={2}
              className={settingsTextareaClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
              Telefone
            </label>
            <Input
              type="text"
              inputMode="tel"
              autoComplete="off"
              placeholder="(XX) XXXXX-XXXX"
              maxLength={15}
              value={receiptDraft.receiptPhone}
              onChange={(e) =>
                updateReceiptDraft({
                  receiptPhone: maskPhone(e.target.value),
                })
              }
              className={cn(settingsControlClass, 'h-11 w-52')}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8B7355]">
              Mensagem de rodape
            </label>
            <textarea
              placeholder="Obrigado pela preferencia!"
              value={receiptDraft.receiptFooter}
              onChange={(e) =>
                updateReceiptDraft({
                  receiptFooter: e.target.value,
                })
              }
              rows={2}
              className={settingsTextareaClass}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={saveReceiptDraft}
              disabled={!receiptHasChanges}
              className="rounded-xl bg-[#A0603A] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#8B4F2D] disabled:cursor-not-allowed disabled:bg-[#D4C8BA]"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={resetReceiptDraft}
              disabled={!receiptHasChanges}
              className="rounded-xl border border-[#E8DDD0] px-4 py-2 text-sm font-bold text-[#8B7355] transition-colors hover:bg-[#FAF6F1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function normalizeReceiptSettings(settings: StoreSettingsData) {
  return {
    receiptCnpj: maskCnpj(settings.receiptCnpj ?? ''),
    receiptAddress: settings.receiptAddress ?? '',
    receiptPhone: maskPhone(settings.receiptPhone ?? ''),
    receiptFooter: settings.receiptFooter ?? '',
  };
}

function isSameReceiptSettings(
  a: ReturnType<typeof normalizeReceiptSettings>,
  b: ReturnType<typeof normalizeReceiptSettings>,
) {
  return (
    a.receiptCnpj === b.receiptCnpj &&
    a.receiptAddress === b.receiptAddress &&
    a.receiptPhone === b.receiptPhone &&
    a.receiptFooter === b.receiptFooter
  );
}

function getBannerUploadErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError && error.status === 413) {
    return 'Imagem muito grande. Envie um arquivo JPG, PNG ou WebP com ate 5 MB.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Nao foi possivel enviar o banner. Tente novamente.';
}
