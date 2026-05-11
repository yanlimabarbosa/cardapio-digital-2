export class CustomerAlreadyExistsError extends Error {
  public constructor() {
    super('Customer already exists');
  }
}

export class CustomerNotFoundError extends Error {
  public constructor() {
    super('Customer not found');
  }
}

export class CustomerInvalidCredentialsError extends Error {
  public constructor() {
    super('Customer credentials are invalid');
  }
}

export class CustomerInvalidPasswordError extends Error {
  public constructor() {
    super('Customer password is invalid');
  }
}

export class CustomerPasswordAlreadySetError extends Error {
  public constructor() {
    super('Customer password is already set');
  }
}

export class CustomerLoyaltyAdjustmentRejectedError extends Error {
  public constructor(public readonly reason: string) {
    super(reason);
  }
}

export class CustomerProfileNotFoundError extends Error {
  public constructor() {
    super('Customer profile not found');
  }
}
