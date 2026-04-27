import { IsUUID, IsString, IsNumber } from 'class-validator';

export class CreateCardPaymentDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  token!: string;

  @IsString()
  paymentMethodId!: string;

  @IsNumber()
  installments!: number;

  @IsString()
  payerEmail!: string;

  @IsString()
  identificationType!: string;

  @IsString()
  identificationNumber!: string;
}
