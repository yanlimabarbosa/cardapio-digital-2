import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Customer phone number. */
  @IsString()
  @MinLength(10)
  declare public readonly phone: string;

  /** Customer password. */
  @IsString()
  @MinLength(1)
  declare public readonly password: string;
}
