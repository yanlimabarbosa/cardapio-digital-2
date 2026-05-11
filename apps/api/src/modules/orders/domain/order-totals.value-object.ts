export type OrderTotalsSnapshot = {
  readonly deliveryFeeCents: number;
  readonly discountCents: number;
  readonly itemSubtotalCents: number;
  readonly totalCents: number;
};

export class OrderTotals {
  private constructor(
    private readonly itemSubtotalCents: number,
    private readonly deliveryFeeCents: number,
    private readonly discountCents: number,
  ) {}

  public static empty(): OrderTotals {
    return new OrderTotals(0, 0, 0);
  }

  public addItemSubtotal(cents: number): OrderTotals {
    this.assertNonNegativeCents(cents, 'item subtotal');

    return new OrderTotals(
      this.itemSubtotalCents + cents,
      this.deliveryFeeCents,
      this.discountCents,
    );
  }

  public addDeliveryFee(cents: number): OrderTotals {
    this.assertNonNegativeCents(cents, 'delivery fee');

    return new OrderTotals(
      this.itemSubtotalCents,
      this.deliveryFeeCents + cents,
      this.discountCents,
    );
  }

  public applyDiscount(cents: number): OrderTotals {
    this.assertNonNegativeCents(cents, 'discount');

    return new OrderTotals(
      this.itemSubtotalCents,
      this.deliveryFeeCents,
      this.discountCents + cents,
    );
  }

  public totalCents(): number {
    return Math.max(0, this.itemSubtotalCents + this.deliveryFeeCents - this.discountCents);
  }

  public totalAmount(): string {
    return (this.totalCents() / 100).toFixed(2);
  }

  public snapshot(): OrderTotalsSnapshot {
    return {
      itemSubtotalCents: this.itemSubtotalCents,
      deliveryFeeCents: this.deliveryFeeCents,
      discountCents: this.discountCents,
      totalCents: this.totalCents(),
    };
  }

  private assertNonNegativeCents(cents: number, field: string): void {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new Error(`Order totals ${field} must be a non-negative integer amount of cents`);
    }
  }
}
