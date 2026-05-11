export class DeliveryAreaResponseDto {
  public constructor(
    /** Delivery area identifier. */
    public readonly id: string,
    /** Delivery neighborhood name. */
    public readonly neighborhood: string,
    /** Delivery city name. */
    public readonly city: string,
    /** Delivery fee charged for this area. */
    public readonly fee: number,
    /** Normalized city and neighborhood key used by the client matcher. */
    public readonly normalizedKey: string,
    /** Whether this delivery area can be selected by customers. */
    public readonly isActive: boolean,
  ) {}
}
