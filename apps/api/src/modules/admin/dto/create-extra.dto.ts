import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateExtraDto {
  @IsString()
  name!: string;

  @IsNumber()
  price!: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
