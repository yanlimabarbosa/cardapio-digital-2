import { IsArray, IsUUID } from 'class-validator';

export class SetFeaturedProductsDto {
  /** Ordered product identifiers to feature. Empty list clears all featured products. */
  @IsArray()
  @IsUUID(undefined, { each: true })
  declare public readonly productIds: string[];
}
