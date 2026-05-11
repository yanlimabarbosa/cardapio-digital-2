import { IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  /** New customer password. */
  @IsString()
  @MinLength(6)
  declare public readonly password: string;
}
