export class DeleteSectionResponseDto {
  public constructor(
    /** Whether the section delete command completed. */
    public readonly success: boolean,
  ) {}
}
