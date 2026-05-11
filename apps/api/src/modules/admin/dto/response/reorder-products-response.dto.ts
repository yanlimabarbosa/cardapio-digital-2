export class ReorderProductsResponseDto {
  public constructor(
    /** Whether the product reorder command completed. */
    public readonly success: boolean,
  ) {}
}
