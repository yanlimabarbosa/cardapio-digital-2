'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CreditCard, Lock, AlertCircle, MapPin } from 'lucide-react';
import { useDebitCardPayment } from '@/hooks/payments/use-debit-card-payment';
import { usePagBank3dsSession } from '@/hooks/payments/use-pagbank-3ds-session';
import { formatCurrency, isValidCpf, isValidEmail, maskCpf, normalizeEmail } from '@/lib/utils';
import {
  getCardEncryptionErrorMessage,
  getPagBankPaymentErrorMessage,
  PAGBANK_SDK_ENV,
  type PagBank3dsAddress,
} from '@/lib/payment-provider';
import type { DeliveryAddress } from '@cardapio/shared';

interface DebitCardFormProps {
  orderId: string;
  totalAmount: number;
  onSuccess?: () => void;
  initialEmail?: string;
  initialCpf?: string;
  customerPhone: string;
  deliveryAddress?: DeliveryAddress;
}

export function DebitCardForm({
  orderId,
  totalAmount,
  onSuccess,
  initialEmail = '',
  initialCpf = '',
  customerPhone,
  deliveryAddress,
}: DebitCardFormProps) {
  const router = useRouter();
  const threeDsSession = usePagBank3dsSession();
  const debitPayment = useDebitCardPayment();
  const [error, setError] = useState<string | null>(null);
  const [threeDsStatusMessage, setThreeDsStatusMessage] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cpf, setCpf] = useState(initialCpf);
  const [email, setEmail] = useState(initialEmail);

  const [billingCep, setBillingCep] = useState(deliveryAddress?.cep ?? '');
  const [billingStreet, setBillingStreet] = useState(deliveryAddress?.street ?? '');
  const [billingNumber, setBillingNumber] = useState(deliveryAddress?.number ?? '');
  const [billingComplement, setBillingComplement] = useState(deliveryAddress?.complement ?? '');
  const [billingCity, setBillingCity] = useState(deliveryAddress?.city ?? '');
  const [billingState, setBillingState] = useState(deliveryAddress?.state ?? '');

  const isPending = threeDsSession.isPending || debitPayment.isPending;

  function formatCardNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function validateBillingAddress(): PagBank3dsAddress | null {
    const postalCode = billingCep.replace(/\D/g, '');
    const regionCode = billingState.trim().toUpperCase();

    if (!billingStreet.trim() || !billingNumber.trim() || !billingCity.trim() || regionCode.length !== 2) {
      setError('Informe o endereço de cobrança do cartão.');
      return null;
    }

    if (postalCode.length < 5 || postalCode.length > 10) {
      setError('CEP de cobrança inválido.');
      return null;
    }

    return {
      street: billingStreet.trim(),
      number: billingNumber.trim(),
      complement: billingComplement.trim() || undefined,
      city: billingCity.trim(),
      regionCode,
      country: 'BRA',
      postalCode,
    };
  }

  function getPhoneFor3ds() {
    const digits = customerPhone.replace(/\D/g, '');
    const normalized = digits.startsWith('55') ? digits.slice(2) : digits;
    if (normalized.length < 10) return null;

    return {
      country: '55',
      area: normalized.slice(0, 2),
      number: normalized.slice(2),
      type: 'MOBILE' as const,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setThreeDsStatusMessage(null);

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

      const phone = getPhoneFor3ds();
      if (!phone) {
        setError('Telefone inválido para autenticação 3DS.');
        return;
      }

      const billingAddress = validateBillingAddress();
      if (!billingAddress) return;

      const fullName = cardholderName.trim();
      if (fullName.split(/\s+/).length < 2) {
        setError('Informe nome e sobrenome do titular do cartão.');
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
        holder: fullName,
        number: cardNumberDigits,
        expMonth: expirationMonth.padStart(2, '0'),
        expYear: expirationYear,
        securityCode,
      });

      if (encrypted.hasErrors || !encrypted.encryptedCard) {
        setError(getCardEncryptionErrorMessage(encrypted.errors));
        return;
      }

      setThreeDsStatusMessage('Solicitando autenticação 3DS...');
      const session = await threeDsSession.mutateAsync();
      window.PagSeguro.setUp({
        session: session.session,
        env: PAGBANK_SDK_ENV,
      });

      setThreeDsStatusMessage('Autenticando com o banco emissor...');
      const authResult = await window.PagSeguro.authenticate3DS({
        data: {
          customer: {
            name: fullName,
            email: normalizedEmail,
            phones: [phone],
          },
          paymentMethod: {
            type: 'DEBIT_CARD',
            installments: 1,
            card: {
              number: cardNumberDigits,
              expMonth: expirationMonth.padStart(2, '0'),
              expYear: expirationYear,
              holder: {
                name: fullName,
              },
            },
          },
          amount: {
            value: Math.round(totalAmount * 100),
            currency: 'BRL',
          },
          billingAddress,
          shippingAddress: billingAddress,
          dataOnly: false,
        },
        beforeChallenge: async (challenge) => {
          setThreeDsStatusMessage('Confirme a autenticação no seu banco para continuar.');
          await Promise.resolve(challenge.open());
        },
      });

      if (authResult.status !== 'AUTH_FLOW_COMPLETED' || !authResult.id) {
        setThreeDsStatusMessage(null);
        setError(get3dsErrorMessage(authResult.status));
        return;
      }

      setThreeDsStatusMessage('Enviando pagamento ao PagBank...');
      const result = await debitPayment.mutateAsync({
        orderId,
        encryptedCard: encrypted.encryptedCard,
        authenticationId: authResult.id,
        cardholderName: fullName,
        payerEmail: normalizedEmail,
        identificationType: 'CPF',
        identificationNumber: cpfDigits,
      });

      if (result.status === 'approved') {
        setThreeDsStatusMessage(null);
        if (onSuccess) onSuccess();
        else router.push(`/order/${orderId}`);
      } else if (result.status === 'rejected') {
        setThreeDsStatusMessage(null);
        setError(getPaymentErrorMessage(result.statusDetail));
      } else {
        setThreeDsStatusMessage(null);
        if (onSuccess) onSuccess();
        else router.push(`/order/${orderId}`);
      }
    } catch (err: any) {
      setThreeDsStatusMessage(null);
      const detailMessage = err?.detail?.message || err?.message;
      setError(getPagBankPaymentErrorMessage(detailMessage));
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
          Dados do Cartão de Débito
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
                onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                maxLength={23}
                required
                className={inputClass + ' pr-12'}
              />
              <CreditCard className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#C4B5A0]" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Mês</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                value={expirationMonth}
                onChange={(event) => setExpirationMonth(event.target.value.replace(/\D/g, ''))}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Ano</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="AAAA"
                maxLength={4}
                value={expirationYear}
                onChange={(event) => setExpirationYear(event.target.value.replace(/\D/g, ''))}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">CVV</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  maxLength={4}
                  value={securityCode}
                  onChange={(event) => setSecurityCode(event.target.value.replace(/\D/g, ''))}
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
              maxLength={30}
              value={cardholderName}
              onChange={(event) => setCardholderName(event.target.value.toUpperCase())}
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
            <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">CPF</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(event) => setCpf(maskCpf(event.target.value))}
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
        transition={{ delay: 0.12, type: 'spring', damping: 20 }}
        className="rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-5"
      >
        <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8B7355]">
          <MapPin className="h-3.5 w-3.5" />
          Endereço de Cobrança
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">CEP</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="00000-000"
              value={billingCep}
              onChange={(event) => setBillingCep(event.target.value.replace(/\D/g, '').slice(0, 8))}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Rua</label>
            <input
              type="text"
              placeholder="Rua"
              value={billingStreet}
              onChange={(event) => setBillingStreet(event.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Número</label>
              <input
                type="text"
                placeholder="123"
                value={billingNumber}
                onChange={(event) => setBillingNumber(event.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Complemento</label>
              <input
                type="text"
                placeholder="Apto, casa"
                value={billingComplement}
                onChange={(event) => setBillingComplement(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,2fr)_80px] gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">Cidade</label>
              <input
                type="text"
                placeholder="Cidade"
                value={billingCity}
                onChange={(event) => setBillingCity(event.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8B7355]">UF</label>
              <input
                type="text"
                placeholder="SP"
                maxLength={2}
                value={billingState}
                onChange={(event) => setBillingState(event.target.value.replace(/[^A-Za-z]/g, '').toUpperCase())}
                required
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </motion.div>
      )}

      {threeDsStatusMessage && (
        <motion.div
          role="status"
          aria-live="polite"
          data-testid="debit-3ds-status"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
        >
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-blue-700">{threeDsStatusMessage}</p>
        </motion.div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#4A2810] text-base font-bold text-white shadow-lg shadow-[#4A2810]/20 transition-all hover:bg-[#3D1F0A] active:scale-[0.98] disabled:opacity-60 disabled:shadow-none"
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Autenticando...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Pagar no débito {formatCurrency(totalAmount)}
          </>
        )}
      </button>

      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-[#8B7355]">
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3" /> 3DS PagBank
        </span>
        <span className="h-1 w-1 rounded-full bg-[#E8DDD0]" />
        <span>Dados criptografados</span>
      </div>
    </form>
  );
}

function get3dsErrorMessage(status: string): string {
  const messages: Record<string, string> = {
    AUTH_NOT_SUPPORTED: 'Cartão não elegível para 3DS. Use outro cartão ou Pix.',
    CHANGE_PAYMENT_METHOD: 'Autenticação recusada. Use outro cartão ou Pix.',
    REQUIRE_CHALLENGE: 'Não foi possível concluir a autenticação do banco. Tente novamente ou use Pix.',
  };
  return messages[status] || 'Não foi possível autenticar o cartão. Use outro cartão ou Pix.';
}

function getPaymentErrorMessage(statusDetail: string): string {
  const messages: Record<string, string> = {
    DECLINED: 'Pagamento recusado. Tente outro cartão.',
    CANCELED: 'Pagamento cancelado. Tente novamente.',
    CANCELLED: 'Pagamento cancelado. Tente novamente.',
  };
  return messages[statusDetail] || 'Pagamento recusado. Tente outro cartão ou Pix.';
}
