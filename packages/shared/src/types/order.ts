export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PREPARING = 'preparing',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
}

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
}

export interface OptionSelectionDto {
  groupId: string;
  optionIds: string[];
}

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
  extraIds?: string[];
  optionSelections?: OptionSelectionDto[];
}

export interface OrderItemGroupedExtras {
  groupName: string;
  groupId: string;
  options: Array<{ name: string; price: number }>;
}

export interface DeliveryAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CreateOrderDto {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod: PaymentMethod;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress?: DeliveryAddress;
  deliveryAreaId?: string;
  notes?: string;
  couponCode?: string;
  scheduledFor?: string | null;
  items: CreateOrderItemDto[];
  redeemedItems?: Array<{ productId: string }>;
}

export interface OrderItemResponse {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  extras: Array<{ name: string; price: number }> | null;
  groupedExtras?: OrderItemGroupedExtras[] | null;
}

export interface OrderResponse {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress?: DeliveryAddress;
  notes?: string;
  scheduledFor?: string | null;
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
}
