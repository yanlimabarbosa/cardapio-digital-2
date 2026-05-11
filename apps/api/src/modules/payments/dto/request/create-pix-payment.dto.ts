import { IsEmail, IsUUID, Matches } from 'class-validator';

export class CreatePixPaymentDto {
  @IsUUID()
  orderId!: string;

  @IsEmail()
  payerEmail!: string;

  @Matches(/^\d{11}$/)
  payerTaxId!: string;
}
