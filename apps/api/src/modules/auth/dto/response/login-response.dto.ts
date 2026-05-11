export class AuthUserResponseDto {
  public constructor(
    /** Admin user id. */
    public readonly id: string,
    /** Admin user email. */
    public readonly email: string,
    /** Admin display name. */
    public readonly name: string,
  ) {}
}

export class LoginResponseDto {
  public constructor(
    /** Signed admin access token. */
    public readonly accessToken: string,
    /** Authenticated admin user summary. */
    public readonly user: AuthUserResponseDto,
  ) {}
}

export class AuthProfileResponseDto {
  public constructor(
    /** Authenticated admin user id. */
    public readonly id: string,
    /** Authenticated admin user email. */
    public readonly email: string,
  ) {}
}
