export class AdminOptionGroupValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AdminOptionGroupValidationError';
  }
}

export class AdminOptionGroupNotFoundError extends Error {
  public constructor(id: string) {
    super(`Option group ${id} not found`);
    this.name = 'AdminOptionGroupNotFoundError';
  }
}
