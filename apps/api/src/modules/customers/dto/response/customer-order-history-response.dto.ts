import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';

export class CustomerOrderItemExtraResponseDto {
  public constructor(
    /** Extra display name. */
    public readonly name: string,
    /** Extra price as a number. */
    public readonly price: number,
  ) {}
}

export class CustomerOrderItemResponseDto {
  public constructor(
    /** Order item identifier. */
    public readonly id: string,
    /** Product name captured when the order was placed. */
    public readonly productName: string,
    /** Unit price captured when the order was placed. */
    public readonly unitPrice: number,
    /** Quantity ordered. */
    public readonly quantity: number,
    /** Item subtotal as a number. */
    public readonly subtotal: number,
    /** Legacy flat extras attached to the item. */
    public readonly extras: CustomerOrderItemExtraResponseDto[] | null | undefined,
  ) {}
}

export class CustomerOrderResponseDto {
  public constructor(
    /** Order identifier. */
    public readonly id: string,
    /** Sequential order number shown to customers. */
    public readonly orderNumber: number,
    /** Customer name captured when the order was placed. */
    public readonly customerName: string,
    /** Current order status. */
    public readonly status: OrderStatus | undefined,
    /** Order total as a number. */
    public readonly totalAmount: number,
    /** Delivery fee as a number, or null for pickup and free delivery. */
    public readonly deliveryFee: number | null,
    /** Payment method selected for the order. */
    public readonly paymentMethod: PaymentMethod,
    /** Current payment status, when present. */
    public readonly paymentStatus: PaymentStatus | undefined,
    /** Delivery type, defaulting to pickup for legacy orders. */
    public readonly deliveryType: string,
    /** Scheduled fulfillment time, or null for immediate orders. */
    public readonly scheduledFor: string | null,
    /** Order items. */
    public readonly items: CustomerOrderItemResponseDto[],
    /** Order creation time in ISO format. */
    public readonly createdAt: string,
  ) {}
}

export class CustomerOrderHistoryResponseDto {
  public constructor(
    /** Customer orders for the requested page. */
    public readonly orders: CustomerOrderResponseDto[],
    /** Total matching orders. */
    public readonly total: number,
    /** Current page number. */
    public readonly page: number,
    /** Total number of pages. */
    public readonly totalPages: number,
  ) {}
}
