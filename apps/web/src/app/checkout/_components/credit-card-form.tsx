'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useCardPayment } from '@/hooks/payments/use-card-payment';
import { maskCpf, isValidCpf, formatCurrency } from '@/lib/utils';
import { Loader2, CreditCard, Lock, ChevronDown, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CreditCardFormProps {
  orderId: string;
  totalAmount: number;
  onSuccess?: () => void;
}

export function CreditCardForm({ orderId, totalAmount, onSuccess }: CreditCardFormProps) {
  const router = useRouter();
  const cardPayment = useCardPayment();
  const [error, setError] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [installments, setInstallments] = useState(1);

  function formatCardNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (!isValidCpf(cpf)) {
        setError('CPF inválido.');
        return;
      }

      if (!window.MercadoPago) {
        setError('SDK do Mercado Pago não carregou. Recarregue a página.');
        return;
      }

      const mp = new window.MercadoPago(
        process.env.NEXT_PUBLIC_MP_PUBLIC_KEY,
        { locale: 'pt-BR' },
      );

      const tokenResult = await mp.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardExpirationMonth: expirationMonth,
        cardExpirationYear: expirationYear,
        securityCode,
        cardholderName,
        identificationType: 'CPF',
        identificationNumber: cpf.replace(/\D/g, ''),
      });

      if (tokenResult.error) {
        setError('Erro ao processar o cartão. Verifique os dados.');
        return;
      }

      const result = await cardPayment.mutateAsync({
        orderId,
        token: tokenResult.id,
        paymentMethodId: tokenResult.first_six_digits ? getPaymentMethodId(tokenResult.first_six_digits) : 'visa',
        installments,
        payerEmail: email,
        identificationType: 'CPF',
        identificationNumber: cpf.replace(/\D/g, ''),
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
      setError(err.message || 'Erro ao processar pagamento');
    }
  }

  const inputClass =
    'h-12 w-full rounded-xl border border-[#EAD8A0] bg-[#FBF6E9] px-4 text-sm font-medium text-[#2A1508] placeholder-[#B89D5F] outline-none transition-all focus:border-[#6B3E14] focus:ring-2 focus:ring-[#6B3E14]/20';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] p-5"
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#7A4F1C]">
          Dados do Cartão
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A6F40]">
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
              <CreditCard className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B89D5F]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8A6F40]">
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
              <label className="mb-1.5 block text-xs font-semibold text-[#8A6F40]">
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
              <label className="mb-1.5 block text-xs font-semibold text-[#8A6F40]">
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
                <Lock className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B89D5F]" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A6F40]">
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
        className="rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] p-5"
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#7A4F1C]">
          Dados do Pagador
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8A6F40]">
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
            <label className="mb-1.5 block text-xs font-semibold text-[#8A6F40]">
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
        className="rounded-2xl border border-[#EAD8A0] bg-[#FBF6E9] p-5"
      >
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#7A4F1C]">
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
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6F40]" />
        </div>
      </motion.div>

      {error && (
        <motion.div
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
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#6B3E14] text-base font-bold text-white shadow-lg shadow-[#6B3E14]/20 transition-all hover:bg-[#5C2F10] active:scale-[0.98] disabled:opacity-60 disabled:shadow-none"
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

        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-[#9A8654]">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3" /> Pagamento seguro
          </span>
          <span className="h-1 w-1 rounded-full bg-[#EAD8A0]" />
          <span>Dados criptografados</span>
        </div>
      </motion.div>
    </form>
  );
}

function getPaymentMethodId(bin: string): string {
  if (bin.startsWith('4')) return 'visa';
  if (bin.startsWith('51') || bin.startsWith('52') || bin.startsWith('53') || bin.startsWith('54') || bin.startsWith('55')) return 'master';
  if (bin.startsWith('2221') || bin.startsWith('23') || bin.startsWith('24') || bin.startsWith('25') || bin.startsWith('26') || bin.startsWith('27')) return 'master';
  if (bin.startsWith('34') || bin.startsWith('37')) return 'amex';
  if (bin.startsWith('636368') || bin.startsWith('438935') || bin.startsWith('504175') || bin.startsWith('451416')) return 'elo';
  if (bin.startsWith('606282') || bin.startsWith('3841')) return 'hipercard';
  return 'visa';
}

function getErrorMessage(statusDetail: string): string {
  const messages: Record<string, string> = {
    cc_rejected_insufficient_amount: 'Saldo insuficiente.',
    cc_rejected_bad_filled_card_number: 'Número do cartão incorreto.',
    cc_rejected_bad_filled_date: 'Data de validade incorreta.',
    cc_rejected_bad_filled_security_code: 'CVV incorreto.',
    cc_rejected_bad_filled_other: 'Dados do cartão incorretos.',
    cc_rejected_call_for_authorize: 'Entre em contato com a operadora do cartão.',
    cc_rejected_card_disabled: 'Cartão desabilitado. Entre em contato com a operadora.',
    cc_rejected_max_attempts: 'Número máximo de tentativas excedido.',
  };
  return messages[statusDetail] || 'Pagamento recusado. Tente outro cartão.';
}
