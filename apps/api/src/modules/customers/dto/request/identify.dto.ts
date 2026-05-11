import { IsString, MinLength } from 'class-validator';

export class IdentifyDto {
  @IsString()
  @MinLength(10)
  phone!: string;
}
