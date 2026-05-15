export class AdminGroupOptionMutationResponseDto {
  public constructor(
    /** Group option identifier. */
    public readonly id: string,
    /** Group option display name. */
    public readonly name: string,
    /** Persisted decimal price for this group option. */
    public readonly price: string,
    /** Optional image URL. */
    public readonly imageUrl: string | undefined,
    /** Sort position inside the option group. */
    public readonly sortOrder: number,
    /** Whether this group option is active. */
    public readonly isActive: boolean,
    /** Whether this group option is visible but sold out. */
    public readonly isSoldOut: boolean,
  ) {}
}
