export interface CreatePixPaymentDto {
  orderId: string;
}

export interface PixPaymentResponse {
  paymentId: number;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl?: string;
  expiresAt?: string;
}

export interface CreateCardPaymentDto {
  orderId: string;
  token: string;
  paymentMethodId: string;
  installments: number;
  payerEmail: string;
  identificationType: string;
  identificationNumber: string;
}

export interface CardPaymentResponse {
  status: string;
  statusDetail: string;
  paymentId: number;
}

export interface PaymentStatusResponse {
  orderId: string;
  orderStatus: string;
  paymentStatus: string | null;
}
