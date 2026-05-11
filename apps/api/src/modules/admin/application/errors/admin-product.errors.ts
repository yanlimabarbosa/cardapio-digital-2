export class AdminProductNotFoundError extends Error {
  public override readonly name = 'AdminProductNotFoundError';

  public constructor(id: string) {
    super(`Product ${id} not found`);
  }
}

export class AdminProductCategoryNotFoundError extends Error {
  public override readonly name = 'AdminProductCategoryNotFoundError';

  public constructor(id: string) {
    super(`Category ${id} not found`);
  }
}
