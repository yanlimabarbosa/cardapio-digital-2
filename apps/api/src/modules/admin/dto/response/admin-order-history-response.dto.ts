import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import { AdminOrderItemResponseDto } from './admin-order-response.dto';

export class AdminOrderDeliveryAddressResponseDto {
  public constructor(
    /** Delivery postal code. */
    public readonly cep: string,
    /** Delivery street name. */
    public readonly street: string,
    /** Delivery street number. */
    public readonly number: string,
    /** Delivery address complement. */
    public readonly complement: string | undefined,
    /** Delivery neighborhood. */
    public readonly neighborhood: string,
    /** Delivery city. */
    public readonly city: string,
    /** Delivery state. */
    public readonly state: string,
  ) {}
}

export class AdminOrderHistoryOrderResponseDto {
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
    /** Delivery address snapshot, when delivery was selected. */
    public readonly deliveryAddress: AdminOrderDeliveryAddressResponseDto | undefined,
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

export class AdminOrderHistoryResponseDto {
  public constructor(
    /** Orders for the current page. */
    public readonly data: AdminOrderHistoryOrderResponseDto[],
    /** Total matching orders. */
    public readonly total: number,
    /** Current page number. */
    public readonly page: number,
    /** Total number of pages. */
    public readonly totalPages: number,
  ) {}
}
