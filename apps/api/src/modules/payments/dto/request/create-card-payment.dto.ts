import { IsEmail, IsIn, IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCardPaymentDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  encryptedCard!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  cardholderName!: string;

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
