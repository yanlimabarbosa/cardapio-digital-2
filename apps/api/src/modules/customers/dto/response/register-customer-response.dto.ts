export class RegisteredCustomerResponseDto {
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
  ) {}
}

export class RegisterCustomerResponseDto {
  public constructor(
    /** New customer session token. */
    public readonly token: string,
    /** Registered customer summary. */
    public readonly customer: RegisteredCustomerResponseDto,
  ) {}
}
