export class CustomerPhone {
  private constructor(private readonly normalizedValue: string) {}

  public static from(input: string): CustomerPhone {
    return new CustomerPhone(input.replace(/\D/g, ''));
  }

  public get value(): string {
    return this.normalizedValue;
  }

  public equals(other: CustomerPhone): boolean {
    return this.normalizedValue === other.normalizedValue;
  }

  public toString(): string {
    return this.normalizedValue;
  }
}
