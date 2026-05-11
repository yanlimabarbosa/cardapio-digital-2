import type { OrderDeliveryFeeResolution } from './order-delivery-fee.policy';
import type {
  OrderItemGroupedExtras,
  OrderItemSelectedExtra,
  OrderItemSnapshot,
} from './order-item-snapshot.policy';
import { OrderTotals } from './order-totals.value-object';

export type OrderCreationDraftItem = {
  readonly extras: readonly OrderItemSelectedExtra[];
  readonly groupedExtras: readonly OrderItemGroupedExtras[];
  readonly isRedeemed: boolean;
  readonly pointsSpent: number;
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly subtotalCents: number;
  readonly unitPriceCents: number;
};

export type OrderCreationRedeemedItemInput = {
  readonly pointsSpent: number;
  readonly productId: string;
  readonly productName: string;
};

export class InvalidOrderCreationDraftError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderCreationDraftError';
  }
}

export class OrderCreationDraft {
  private constructor(
    private readonly totals: OrderTotals,
    private readonly draftItems: readonly OrderCreationDraftItem[],
  ) {}

  public static empty(): OrderCreationDraft {
    return new OrderCreationDraft(OrderTotals.empty(), []);
  }

  public addPaidItem(snapshot: OrderItemSnapshot): OrderCreationDraft {
    this.assertPresentText(snapshot.productId, 'paid item product id');
    this.assertPresentText(snapshot.productName, 'paid item product name');
    this.assertPositiveInteger(snapshot.quantity, 'paid item quantity');
    this.assertNonNegativeInteger(snapshot.unitPriceCents, 'paid item unit price');
    this.assertNonNegativeInteger(snapshot.subtotalCents, 'paid item subtotal');

    return new OrderCreationDraft(
      this.totals.addItemSubtotal(snapshot.subtotalCents),
      [
        ...this.draftItems,
        {
          productId: snapshot.productId,
          productName: snapshot.productName,
          unitPriceCents: snapshot.unitPriceCents,
          quantity: snapshot.quantity,
          subtotalCents: snapshot.subtotalCents,
          extras: snapshot.extras,
          groupedExtras: snapshot.groupedExtras,
          isRedeemed: false,
          pointsSpent: 0,
        },
      ],
    );
  }

  public applyDeliveryFee(deliveryFee: OrderDeliveryFeeResolution): OrderCreationDraft {
    if (deliveryFee.feeAmount === null) {
      return this;
    }

    return new OrderCreationDraft(
      this.totals.addDeliveryFee(deliveryFee.feeCents),
      this.draftItems,
    );
  }

  public applyCouponDiscount(discountCents: number): OrderCreationDraft {
    return new OrderCreationDraft(
      this.totals.applyDiscount(discountCents),
      this.draftItems,
    );
  }

  public addRedeemedItem(input: OrderCreationRedeemedItemInput): OrderCreationDraft {
    this.assertPresentText(input.productId, 'redeemed item product id');
    this.assertPresentText(input.productName, 'redeemed item product name');
    this.assertNonNegativeInteger(input.pointsSpent, 'redeemed item points');

    return new OrderCreationDraft(
      this.totals,
      [
        ...this.draftItems,
        {
          productId: input.productId,
          productName: input.productName,
          unitPriceCents: 0,
          quantity: 1,
          subtotalCents: 0,
          extras: [],
          groupedExtras: [],
          isRedeemed: true,
          pointsSpent: input.pointsSpent,
        },
      ],
    );
  }

  public totalAmount(): string {
    return this.totals.totalAmount();
  }

  public totalCents(): number {
    return this.totals.totalCents();
  }

  public pointsSpent(): number {
    return this.draftItems.reduce((total, item) => total + item.pointsSpent, 0);
  }

  public items(): readonly OrderCreationDraftItem[] {
    return this.draftItems.map((item) => this.copyItem(item));
  }

  private copyItem(item: OrderCreationDraftItem): OrderCreationDraftItem {
    return {
      ...item,
      extras: item.extras.map((extra) => this.copyExtra(extra)),
      groupedExtras: item.groupedExtras.map((group) => this.copyGroupedExtras(group)),
    };
  }

  private copyExtra(extra: OrderItemSelectedExtra): OrderItemSelectedExtra {
    return {
      name: extra.name,
      price: extra.price,
    };
  }

  private copyGroupedExtras(group: OrderItemGroupedExtras): OrderItemGroupedExtras {
    return {
      groupId: group.groupId,
      groupName: group.groupName,
      options: group.options.map((option) => this.copyExtra(option)),
    };
  }

  private assertPresentText(value: string, field: string): void {
    if (value.trim().length === 0) {
      throw new InvalidOrderCreationDraftError(`Order creation draft ${field} is required`);
    }
  }

  private assertPositiveInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value < 1) {
      throw new InvalidOrderCreationDraftError(`Order creation draft ${field} must be a positive integer`);
    }
  }

  private assertNonNegativeInteger(value: number, field: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new InvalidOrderCreationDraftError(`Order creation draft ${field} must be a non-negative integer`);
    }
  }
}
