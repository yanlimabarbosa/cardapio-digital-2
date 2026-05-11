const CUSTOMER_TOKEN_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CustomerToken {
  private constructor(public readonly value: string) {}

  public static parse(value: string): CustomerToken | null {
    if (!CUSTOMER_TOKEN_UUID_REGEX.test(value)) {
      return null;
    }

    return new CustomerToken(value);
  }

  public equals(other: CustomerToken): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
