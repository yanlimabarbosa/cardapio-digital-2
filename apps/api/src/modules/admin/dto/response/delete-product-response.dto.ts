export class DeleteProductResponseDto {
  public constructor(
    /** Whether the product soft-delete command completed. */
    public readonly success: boolean,
  ) {}
}
