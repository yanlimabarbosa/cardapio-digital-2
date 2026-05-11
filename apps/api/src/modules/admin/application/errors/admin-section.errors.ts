export class AdminSectionNotFoundError extends Error {
  public override readonly name = 'AdminSectionNotFoundError';

  public constructor(id: string) {
    super(`Section ${id} not found`);
  }
}

export class AdminSectionProductNotFoundError extends Error {
  public override readonly name = 'AdminSectionProductNotFoundError';

  public constructor(public readonly productId: string) {
    super(`Product ${productId} not found for section products`);
  }
}
