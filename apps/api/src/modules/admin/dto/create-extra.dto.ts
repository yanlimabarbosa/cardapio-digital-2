import { IsString, IsNumber } from 'class-validator';

export class CreateExtraDto {
  @IsString()
  name!: string;

  @IsNumber()
  price!: number;
}
