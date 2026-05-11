export class AdminProductExtraNotFoundError extends Error {
  public override readonly name = 'AdminProductExtraNotFoundError';

  public constructor(id: string) {
    super(`Extra ${id} not found`);
  }
}

export class AdminGroupOptionNotFoundError extends Error {
  public override readonly name: string = 'AdminGroupOptionNotFoundError';

  public constructor(id: string) {
    super(`Group option ${id} not found`);
  }
}
