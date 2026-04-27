'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Copy, Check, QrCode, ShieldCheck, Smartphone, Loader2, Timer } from 'lucide-react';
import { usePaymentStatus } from '@/hooks/payments/use-payment-status';
import { useOrderSocket } from '@/hooks/orders/use-order-socket';
import type { PixPaymentResponse } from '@cardapio/shared';

interface PixPaymentProps {
  pixData: PixPaymentResponse;
  orderId: string;
}

export function PixPayment({ pixData, orderId }: PixPaymentProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const { data: status } = usePaymentStatus(orderId, true);

  // Real-time updates via WebSocket (instant notification when payment is approved)
  useOrderSocket(orderId, (data) => {
    if (data.status === 'paid') {
      router.push(`/order/${orderId}`);
    }
  });

  // Countdown timer
  const expiresAt = useMemo(() => {
    const maxMs = 30 * 60 * 1000; // cap at 30 min
    if (pixData.expiresAt) {
      const parsed = new Date(pixData.expiresAt).getTime();
      const diff = parsed - Date.now();
      // If API returns > 30 min (sandbox/default), cap it
      if (diff > maxMs) return Date.now() + maxMs;
      return parsed;
    }
    return Date.now() + maxMs;
  }, [pixData.expiresAt]);

  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const tick = () => setTimeLeft(Math.max(0, expiresAt - Date.now()));
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const expired = timeLeft <= 0;
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isUrgent = timeLeft < 5 * 60000;

  useEffect(() => {
    if (status?.paymentStatus === 'approved' || status?.orderStatus === 'paid') {
      router.push(`/order/${orderId}`);
    }
  }, [status, orderId, router]);

  async function copyCode() {
    if (!pixData.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
    } catch {
      // Fallback for non-HTTPS contexts (LAN IP, etc.)
      const textarea = document.createElement('textarea');
      textarea.value = pixData.qrCode;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] p-6"
      >
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute -left-2 -top-2 h-5 w-5 rounded-tl-lg border-l-[3px] border-t-[3px] border-terra-600" />
            <div className="absolute -right-2 -top-2 h-5 w-5 rounded-tr-lg border-r-[3px] border-t-[3px] border-terra-600" />
            <div className="absolute -bottom-2 -left-2 h-5 w-5 rounded-bl-lg border-b-[3px] border-l-[3px] border-terra-600" />
            <div className="absolute -bottom-2 -right-2 h-5 w-5 rounded-br-lg border-b-[3px] border-r-[3px] border-terra-600" />

            {pixData.qrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                alt="QR Code Pix"
                className="h-52 w-52 rounded-lg"
              />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center rounded-lg bg-[#FDF7E3]">
                <QrCode className="h-20 w-20 text-[#EAD8A0]" />
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-[#8A6F40]">
            <Smartphone className="h-4 w-4" />
            <span>Escaneie com o app do seu banco</span>
          </div>
        </div>
      </motion.div>

      {pixData.qrCode && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: 'spring', damping: 20 }}
          className="rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] p-5"
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#7A4F1C]">
            Ou copie o código Pix
          </p>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1 rounded-xl border border-[#EAD8A0] bg-[#FBF6E9] px-4 py-3">
              <p className="truncate text-xs font-medium text-[#2A1508]">{pixData.qrCode}</p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className={`flex h-auto w-14 shrink-0 items-center justify-center rounded-xl border-2 font-semibold transition-all ${
                copied
                  ? 'border-green-400 bg-green-50 text-green-600'
                  : 'border-terra-600 bg-terra-600 text-white hover:bg-terra-700 active:scale-95'
              }`}
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          {copied && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-center text-xs font-semibold text-green-600"
            >
              Código copiado!
            </motion.p>
          )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col items-center gap-3 py-4"
      >
        {expired ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Timer className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-red-600">Código Pix expirado</p>
            <p className="text-xs text-[#8A6F40]">Volte e gere um novo código</p>
          </>
        ) : (
          <div className="w-full rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] px-5 py-5">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-terra-600/20" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-terra-600/10">
                  <Loader2 className="h-5 w-5 animate-spin text-terra-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-[#2A1508]">Aguardando pagamento...</p>
              <p className={`flex items-center gap-1.5 text-sm font-bold tabular-nums ${isUrgent ? 'text-red-500' : 'text-[#8A6F40]'}`}>
                <Timer className="h-3.5 w-3.5" />
                Expira em {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
              <div className="flex items-center gap-3 text-[11px] font-normal text-[#9A8654]">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Pagamento seguro</span>
                <span className="h-1 w-1 rounded-full bg-[#EAD8A0]" />
                <span>Confirmação automática</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
