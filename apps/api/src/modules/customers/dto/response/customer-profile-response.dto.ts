export class CustomerProfileResponseDto {
  public constructor(
    /** Customer display name. */
    public readonly name: string,
    /** Customer phone number. */
    public readonly phone: string,
    /** Whether this customer has a password set. */
    public readonly hasPassword: boolean,
    /** Current loyalty points balance. */
    public readonly loyaltyPoints: number,
    /** Whether this customer phone also belongs to an admin user. */
    public readonly isAdmin: boolean,
    /** Number of orders placed by this customer. */
    public readonly totalOrders: number,
    /** Customer creation timestamp as an ISO string. */
    public readonly memberSince: string,
  ) {}
}
