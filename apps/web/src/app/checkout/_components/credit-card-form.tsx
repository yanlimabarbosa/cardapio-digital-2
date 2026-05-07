'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useCardPayment } from '@/hooks/payments/use-card-payment';
import { maskCpf, isValidCpf, formatCurrency, isValidEmail, normalizeEmail } from '@/lib/utils';
import { getCardEncryptionErrorMessage, getPagBankPaymentErrorMessage } from '@/lib/payment-provider';
import { Loader2, CreditCard, Lock, ChevronDown, AlertCircle } from 'lucide-react';

interface CreditCardFormProps {
  orderId: string;
  totalAmount: number;
  onSuccess?: () => void;
  initialEmail?: string;
  initialCpf?: string;
}

export function CreditCardForm({ orderId, totalAmount, onSuccess, initialEmail = '', initialCpf = '' }: CreditCardFormProps) {
  const router = useRouter();
  const cardPayment = useCardPayment();
  const [error, setError] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cpf, setCpf] = useState(initialCpf);
  const [email, setEmail] = useState(initialEmail);
  const [installments, setInstallments] = useState(1);

  function formatCardNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const normalizedEmail = normalizeEmail(email);

      if (!isValidEmail(normalizedEmail)) {
        setError('Informe um e-mail válido.');
        return;
      }

      if (!isValidCpf(cpf)) {
        setError('CPF inválido.');
        return;
      }

      const cpfDigits = cpf.replace(/\D/g, '');
      const cardNumberDigits = cardNumber.replace(/\s/g, '');

      if (!window.PagSeguro) {
        setError('SDK do PagBank não carregou. Recarregue a página.');
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_PAGBANK_PUBLIC_KEY;
      if (!publicKey) {
        setError('Chave pública do PagBank não configurada.');
        return;
      }

      const encrypted = window.PagSeguro.encryptCard({
        publicKey,
        holder: cardholderName,
        number: cardNumberDigits,
        expMonth: expirationMonth.padStart(2, '0'),
        expYear: expirationYear,
        securityCode,
      });

      if (encrypted.hasErrors || !encrypted.encryptedCard) {
        setError(getCardEncryptionErrorMessage(encrypted.errors));
        return;
      }

      const result = await cardPayment.mutateAsync({
        orderId,
        encryptedCard: encrypted.encryptedCard,
        installments,
        payerEmail: normalizedEmail,
        identificationType: 'CPF',
        identificationNumber: cpfDigits,
      });

      if (result.status === 'approved') {
        if (onSuccess) onSuccess();
        else router.push(`/order/${orderId}`);
      } else if (result.status === 'rejected') {
        setError(getErrorMessage(result.statusDetail));
      } else {
        if (onSuccess) onSuccess();
        else router.push(`/order/${orderId}`);
      }
    } catch (err: any) {
      setError(getPagBankPaymentErrorMessage(err.message));
    }
  }

  const inputClass =
    'h-12 w-full rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] px-4 text-sm font-medium text-[#3D2B1F] placeholder-[#C4B5A0] outline-none transition-all focus:border-[#4A2810] focus:ring-2 focus:ring-[#4A2810]/20';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-5"
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8B7355]">
          Dados do Cartão
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">
              Número do Cartão
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                required
                className={inputClass + ' pr-12'}
              />
              <CreditCard className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A0]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">
                Mês
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                value={expirationMonth}
                onChange={(e) => setExpirationMonth(e.target.value.replace(/\D/g, ''))}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">
                Ano
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="AAAA"
                maxLength={4}
                value={expirationYear}
                onChange={(e) => setExpirationYear(e.target.value.replace(/\D/g, ''))}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">
                CVV
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  maxLength={4}
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ''))}
                  required
                  className={inputClass + ' pr-9'}
                />
                <Lock className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#C4B5A0]" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">
              Nome no Cartão
            </label>
            <input
              type="text"
              placeholder="Nome como está no cartão"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
              required
              className={inputClass}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, type: 'spring', damping: 20 }}
        className="rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-5"
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8B7355]">
          Dados do Pagador
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">
              CPF
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              maxLength={14}
              required
              className={inputClass}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', damping: 20 }}
        className="rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-5"
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8B7355]">
          Parcelas
        </p>

        <div className="relative">
          <select
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
            className={inputClass + ' appearance-none cursor-pointer pr-10'}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}x de {formatCurrency(totalAmount / n)}
                {n === 1 ? ' à vista' : ' sem juros'}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B7355]" />
        </div>
      </motion.div>

      {error && (
        <motion.div
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <button
          type="submit"
          disabled={cardPayment.isPending}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#4A2810] text-base font-bold text-white shadow-lg shadow-[#4A2810]/20 transition-all hover:bg-[#3D1F0A] active:scale-[0.98] disabled:opacity-60 disabled:shadow-none"
        >
          {cardPayment.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Pagar {formatCurrency(totalAmount)}
            </>
          )}
        </button>

        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-[#8B7355]">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3" /> Pagamento seguro
          </span>
          <span className="h-1 w-1 rounded-full bg-[#E8DDD0]" />
          <span>Dados criptografados</span>
        </div>
      </motion.div>
    </form>
  );
}

function getErrorMessage(statusDetail: string): string {
  const messages: Record<string, string> = {
    DECLINED: 'Pagamento recusado. Tente outro cartão.',
    CANCELED: 'Pagamento cancelado. Tente novamente.',
    CANCELLED: 'Pagamento cancelado. Tente novamente.',
  };
  return messages[statusDetail] || 'Pagamento recusado. Tente outro cartão.';
}
