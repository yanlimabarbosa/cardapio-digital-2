export class AdminProductExtraListResponseDto {
  public constructor(
    /** Extra identifier. */
    public readonly id: string,
    /** Extra display name. */
    public readonly name: string,
    /** Price charged for this extra. */
    public readonly price: number,
    /** Optional image URL. */
    public readonly imageUrl: string | undefined,
    /** Whether this extra is active. */
    public readonly isActive: boolean,
  ) {}
}
