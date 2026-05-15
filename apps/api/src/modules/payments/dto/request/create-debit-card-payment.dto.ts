import { IsEmail, IsIn, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateDebitCardPaymentDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  encryptedCard!: string;

  @IsString()
  @Matches(/^3DS_/)
  authenticationId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  cardholderName!: string;

  @IsEmail()
  payerEmail!: string;

  @IsIn(['CPF'])
  identificationType!: string;

  @Matches(/^\d{11}$/)
  identificationNumber!: string;
}
