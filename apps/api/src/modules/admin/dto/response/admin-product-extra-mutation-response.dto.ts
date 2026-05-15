export class AdminProductExtraMutationResponseDto {
  public constructor(
    /** Extra identifier. */
    public readonly id: string,
    /** Extra display name. */
    public readonly name: string,
    /** Persisted decimal price for this extra. */
    public readonly price: string,
    /** Optional image URL. */
    public readonly imageUrl: string | undefined,
    /** Sort position inside the product. */
    public readonly sortOrder: number,
    /** Whether this extra is active. */
    public readonly isActive: boolean,
    /** Whether this extra is visible but sold out. */
    public readonly isSoldOut: boolean,
  ) {}
}
