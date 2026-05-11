import { normalizeNeighborhood } from '@cardapio/shared';

export interface DeliveryAreaKeyInput {
  readonly city: string;
  readonly neighborhood: string;
}

export class DeliveryAreaKeyPolicy {
  private constructor(private readonly input: DeliveryAreaKeyInput) {}

  public static create(input: DeliveryAreaKeyInput): DeliveryAreaKeyPolicy {
    return new DeliveryAreaKeyPolicy(input);
  }

  public normalizedKey(): string {
    return normalizeNeighborhood(`${this.input.city} ${this.input.neighborhood}`);
  }

  public matches(normalizedKey: string): boolean {
    return this.normalizedKey() === normalizeNeighborhood(normalizedKey);
  }
}
