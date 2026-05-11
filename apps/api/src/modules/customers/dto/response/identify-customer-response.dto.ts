export enum IdentifyCustomerActionDto {
  Authenticated = 'authenticated',
  Login = 'login',
  Register = 'register',
}

export class IdentifyCustomerSummaryResponseDto {
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

export class IdentifyCustomerResponseDto {
  public constructor(
    /** Whether a customer already exists for the submitted phone. */
    public readonly exists: boolean,
    /** Next action the client should take. */
    public readonly action: IdentifyCustomerActionDto,
    /** Whether this customer has a password set. */
    public readonly hasPassword?: boolean,
    /** New customer session token for passwordless existing customers. */
    public readonly token?: string,
    /** Customer summary for passwordless authenticated customers. */
    public readonly customer?: IdentifyCustomerSummaryResponseDto,
  ) {}
}
