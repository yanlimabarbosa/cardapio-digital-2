export const PAGBANK_SDK_URL =
  'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js';

export const PAGBANK_SDK_ENV =
  process.env.NEXT_PUBLIC_PAGBANK_ENV?.toLowerCase() === 'production' ? 'PROD' : 'SANDBOX';

export interface PagBankCardInput {
  publicKey: string;
  holder: string;
  number: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
}

export interface PagBankCardEncryptionResult {
  encryptedCard?: string;
  hasErrors?: boolean;
  errors?: Array<{ code?: string; message?: string }>;
}

const CARD_ENCRYPTION_ERROR_MESSAGES: Record<string, string> = {
  INVALID_NUMBER: 'Número do cartão inválido.',
  INVALID_SECURITY_CODE: 'Código de segurança inválido.',
  INVALID_EXPIRATION_MONTH: 'Mês de vencimento inválido.',
  INVALID_EXPIRATION_YEAR: 'Ano de vencimento inválido.',
  INVALID_PUBLIC_KEY: 'Chave pública do PagBank inválida. Avise o restaurante.',
  INVALID_HOLDER: 'Nome do titular inválido.',
};

export function getCardEncryptionErrorMessage(errors?: PagBankCardEncryptionResult['errors']): string {
  const messages = errors
    ?.map((error) => {
      if (error.code && CARD_ENCRYPTION_ERROR_MESSAGES[error.code]) {
        return CARD_ENCRYPTION_ERROR_MESSAGES[error.code];
      }
      return null;
    })
    .filter(Boolean);

  if (messages?.length) {
    return Array.from(new Set(messages)).join(' ');
  }

  return 'Erro ao criptografar o cartão. Verifique os dados.';
}

export function getPagBankPaymentErrorMessage(message?: string): string {
  const normalized = message?.trim();
  if (!normalized) return 'Erro ao processar pagamento. Tente novamente.';

  const lower = normalized.toLowerCase();

  if (
    lower.includes('transienttoken') ||
    lower.includes('authentication is required for debit card') ||
    (lower.includes('charges[0].unknown') && lower.includes('card')) ||
    (lower.includes('transaction.card') && lower.includes('securitycode'))
  ) {
    return 'Cartão de débito inválido ou não aceito. Use outro cartão ou Pix.';
  }

  if (lower.includes('payment_method.card.encrypted') || (lower.includes('invalid_parameter') && lower.includes('card'))) {
    return 'Dados do cartão inválidos. Confira número, validade, CVV e nome.';
  }

  if (lower.includes('access_denied') || lower.includes('whitelist')) {
    return 'Pagamento temporariamente indisponível. Avise o restaurante.';
  }

  if (lower.includes('unauthorized') || lower.includes('invalid token')) {
    return 'Pagamento temporariamente indisponível. Avise o restaurante.';
  }

  return 'Erro ao processar pagamento. Tente novamente ou use Pix.';
}

export interface PagBank3dsAuthResult {
  status: 'AUTH_FLOW_COMPLETED' | 'AUTH_NOT_SUPPORTED' | 'CHANGE_PAYMENT_METHOD' | 'REQUIRE_CHALLENGE' | string;
  authenticationStatus?: string;
  id?: string;
}

export interface PagBank3dsAuthRequest {
  data: {
    customer: {
      name: string;
      email: string;
      phones: Array<{
        country: string;
        area: string;
        number: string;
        type: 'MOBILE' | 'HOME' | 'BUSINESS';
      }>;
    };
    paymentMethod: {
      type: 'DEBIT_CARD' | 'CREDIT_CARD';
      installments: number;
      card: {
        encrypted?: string;
        number?: string;
        expMonth?: string;
        expYear?: string;
        holder?: {
          name: string;
        };
      };
    };
    amount: {
      value: number;
      currency: 'BRL';
    };
    billingAddress: PagBank3dsAddress;
    shippingAddress?: PagBank3dsAddress;
    dataOnly: false;
  };
  beforeChallenge?: (challenge: PagBank3dsChallenge) => void | Promise<void>;
}

export interface PagBank3dsChallenge {
  brand: string;
  issuer?: string;
  open: () => void | Promise<void>;
}

export interface PagBank3dsAddress {
  street: string;
  number: string;
  complement?: string;
  regionCode: string;
  country: 'BRA';
  city: string;
  postalCode: string;
}

declare global {
  interface Window {
    PagSeguro?: {
      encryptCard: (data: PagBankCardInput) => PagBankCardEncryptionResult;
      setUp: (data: { session: string; env: 'SANDBOX' | 'PROD' }) => void;
      authenticate3DS: (data: PagBank3dsAuthRequest) => Promise<PagBank3dsAuthResult>;
      PagSeguroError?: new (...args: any[]) => Error;
    };
  }
}
