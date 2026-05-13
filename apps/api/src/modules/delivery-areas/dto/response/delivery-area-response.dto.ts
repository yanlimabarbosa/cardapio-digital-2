export class DeliveryAreaResponseDto {
  public constructor(
    /** Delivery area identifier. */
    public readonly id: string,
    /** ViaCEP neighborhood key used for matching. */
    public readonly neighborhood: string,
    /** Delivery city name. */
    public readonly city: string,
    /** Delivery fee charged for this area. */
    public readonly fee: number,
    /** Normalized city and neighborhood key used by the client matcher. */
    public readonly normalizedKey: string,
    /** Normalized ViaCEP city/neighborhood keys that can select this area. */
    public readonly matchNormalizedKeys: readonly string[],
    /** Whether this delivery area can be selected by customers. */
    public readonly isActive: boolean,
  ) {}
}
