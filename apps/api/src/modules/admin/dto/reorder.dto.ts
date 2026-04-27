import { IsArray, ValidateNested, IsUUID, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ReorderItemDto {
  @IsUUID()
  id!: string;

  @IsNumber()
  sortOrder!: number;
}

export class ReorderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
