import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';

export class AdminOrderItemExtraResponseDto {
  public constructor(
    /** Extra or option display name. */
    public readonly name: string,
    /** Extra or option price. */
    public readonly price: number,
  ) {}
}

export class AdminOrderItemGroupedExtraResponseDto {
  public constructor(
    /** Option group identifier. */
    public readonly groupId: string,
    /** Option group display name. */
    public readonly groupName: string,
    /** Selected options inside the group. */
    public readonly options: AdminOrderItemExtraResponseDto[],
  ) {}
}

export class AdminOrderItemResponseDto {
  public constructor(
    /** Order item identifier. */
    public readonly id: string,
    /** Product name snapshot. */
    public readonly productName: string,
    /** Unit price charged for this item. */
    public readonly unitPrice: number,
    /** Quantity ordered. */
    public readonly quantity: number,
    /** Item subtotal. */
    public readonly subtotal: number,
    /** Flat extras selected for this item. */
    public readonly extras: AdminOrderItemExtraResponseDto[] | undefined,
    /** Grouped option selections for this item. */
    public readonly groupedExtras: AdminOrderItemGroupedExtraResponseDto[] | null,
  ) {}
}

export class AdminOrderResponseDto {
  public constructor(
    /** Order identifier. */
    public readonly id: string,
    /** Daily order number. */
    public readonly orderNumber: number,
    /** Customer display name. */
    public readonly customerName: string,
    /** Customer phone number. */
    public readonly customerPhone: string,
    /** Current order status. */
    public readonly status: OrderStatus | undefined,
    /** Server-calculated total amount. */
    public readonly totalAmount: number,
    /** Delivery fee charged, or null for pickup. */
    public readonly deliveryFee: number | null,
    /** Payment method selected by the customer. */
    public readonly paymentMethod: PaymentMethod,
    /** Current payment status. */
    public readonly paymentStatus: PaymentStatus | undefined,
    /** Delivery type, defaulting to pickup for legacy orders. */
    public readonly deliveryType: string,
    /** Scheduled fulfillment time, or null for immediate orders. */
    public readonly scheduledFor: string | null,
    /** Number of order items. */
    public readonly itemCount: number,
    /** Order item snapshots. */
    public readonly items: AdminOrderItemResponseDto[],
    /** Order creation timestamp. */
    public readonly createdAt: Date | undefined,
  ) {}
}
