export class AdminCombinedLimitValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AdminCombinedLimitValidationError';
  }
}

export class AdminCombinedLimitNotFoundError extends Error {
  public constructor(id: string) {
    super(`Combined limit ${id} not found`);
    this.name = 'AdminCombinedLimitNotFoundError';
  }
}
