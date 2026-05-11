import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Admin email address. */
  @IsEmail()
  declare public readonly email: string;

  /** Admin password. */
  @IsString()
  @MinLength(4)
  declare public readonly password: string;
}
