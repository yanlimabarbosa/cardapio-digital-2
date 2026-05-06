export interface CreatePixPaymentDto {
  orderId: string;
  payerEmail: string;
  payerTaxId: string;
}

export interface PixPaymentResponse {
  paymentId: number | string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl?: string;
  expiresAt?: string;
}

export interface CreateCardPaymentDto {
  orderId: string;
  encryptedCard: string;
  installments: number;
  payerEmail: string;
  identificationType: string;
  identificationNumber: string;
}

export interface CardPaymentResponse {
  status: string;
  statusDetail: string;
  paymentId: number | string;
}

export interface PagBank3dsSessionResponse {
  session: string;
  expiresAt: number;
}

export interface CreateDebitCardPaymentDto {
  orderId: string;
  encryptedCard: string;
  authenticationId: string;
  payerEmail: string;
  identificationType: string;
  identificationNumber: string;
}

export type DebitCardPaymentResponse = CardPaymentResponse;

export interface PaymentStatusResponse {
  orderId: string;
  orderStatus: string;
  paymentStatus: string | null;
}
