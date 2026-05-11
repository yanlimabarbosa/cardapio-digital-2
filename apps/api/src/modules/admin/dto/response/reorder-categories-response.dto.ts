export class ReorderCategoriesResponseDto {
  public constructor(
    /** Whether the category reorder command completed. */
    public readonly success: boolean,
  ) {}
}
