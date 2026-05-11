import { IsEmail, IsIn, IsInt, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export class CreateCardPaymentDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  encryptedCard!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  installments!: number;

  @IsEmail()
  payerEmail!: string;

  @IsIn(['CPF'])
  identificationType!: string;

  @Matches(/^\d{11}$/)
  identificationNumber!: string;
}
