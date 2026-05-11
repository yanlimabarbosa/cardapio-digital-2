export class DeliveryAreaAlreadyExistsError extends Error {
  public constructor() {
    super('Delivery area already exists');
  }
}

export class DeliveryAreaNotFoundError extends Error {
  public constructor() {
    super('Delivery area not found');
  }
}
