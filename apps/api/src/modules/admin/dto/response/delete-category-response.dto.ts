export class DeleteCategoryResponseDto {
  public constructor(
    /** Whether the category delete command completed. */
    public readonly success: boolean,
  ) {}
}
