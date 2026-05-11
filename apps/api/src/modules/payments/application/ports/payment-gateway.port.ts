import type { GatewayPaymentStatus } from '../../domain/payment-status.policy';
import type { PaymentOrder } from './payment-order.port';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export type CreatePixPaymentInput = {
  readonly order: PaymentOrder;
  readonly payerEmail: string;
  readonly payerTaxId: string;
};

export type CreateCreditCardPaymentInput = {
  readonly encryptedCard: string;
  readonly installments: number;
  readonly order: PaymentOrder;
  readonly payerEmail: string;
  readonly payerTaxId: string;
};

export type CreateDebitCardPaymentInput = {
  readonly authenticationId: string;
  readonly encryptedCard: string;
  readonly order: PaymentOrder;
  readonly payerEmail: string;
  readonly payerTaxId: string;
};

export type PixPaymentResult = {
  readonly expiresAt?: string;
  readonly paymentId: string;
  readonly qrCode: string;
  readonly qrCodeBase64: string;
};

export type CardPaymentResult = {
  readonly paymentId: string;
  readonly status: GatewayPaymentStatus;
  readonly statusDetail: string;
};

export type Payment3dsSessionResult = {
  readonly expiresAt: number;
  readonly session: string;
};

export type GetPaymentStatusQuery = {
  readonly externalId: string;
};

export type PaymentGatewayStatusResult = {
  readonly externalId: string;
  readonly referenceId?: string;
  readonly status: GatewayPaymentStatus;
};

export interface PaymentGateway {
  create3dsSession(): Promise<Payment3dsSessionResult>;
  createCreditCardPayment(input: CreateCreditCardPaymentInput): Promise<CardPaymentResult>;
  createDebitCardPayment(input: CreateDebitCardPaymentInput): Promise<CardPaymentResult>;
  createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult>;
  getPaymentStatus(query: GetPaymentStatusQuery): Promise<PaymentGatewayStatusResult>;
}
