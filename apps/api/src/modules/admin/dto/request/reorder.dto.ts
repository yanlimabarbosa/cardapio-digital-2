import { IsArray, ValidateNested, IsUUID, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderItemDto {
  /** Identifier of the item to reorder. */
  @IsUUID()
  declare public readonly id: string;

  /** New sort position for the item. */
  @IsNumber()
  declare public readonly sortOrder: number;
}

export class ReorderDto {
  /** Ordered item positions to apply. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  declare public readonly items: ReorderItemDto[];
}
