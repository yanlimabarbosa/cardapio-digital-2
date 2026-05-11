export class AdminInvalidCredentialsError extends Error {
  public override readonly name = 'AdminInvalidCredentialsError';

  public constructor() {
    super('Admin credentials are invalid');
  }
}
