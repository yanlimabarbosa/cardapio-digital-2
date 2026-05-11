import { IsEmail, IsIn, IsString, IsUUID, Matches } from 'class-validator';

export class CreateDebitCardPaymentDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  encryptedCard!: string;

  @IsString()
  @Matches(/^3DS_/)
  authenticationId!: string;

  @IsEmail()
  payerEmail!: string;

  @IsIn(['CPF'])
  identificationType!: string;

  @Matches(/^\d{11}$/)
  identificationNumber!: string;
}
