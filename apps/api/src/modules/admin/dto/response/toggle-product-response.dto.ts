export class ToggleProductResponseDto {
  public constructor(
    /** Product id. */
    public readonly id: string,
    /** Current product active state after toggling. */
    public readonly isActive: boolean,
  ) {}
}
