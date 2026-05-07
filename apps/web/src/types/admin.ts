import type { WeeklySchedule } from '@cardapio/shared';

export interface Dashboard {
  todayOrdersCount: number;
  todayPaidCount: number;
  todayRevenue: number;
  avgTicket: number;
  ordersByStatus: Record<string, number>;
  revenueByHour: { hour: number; revenue: number; orders: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  byPayment: Record<string, number>;
  weeklyRevenue: { date: string; revenue: number; orders: number }[];
}

export interface StoreSettingsData {
  openingTime: string;
  closingTime: string;
  openDays: number[];
  weeklySchedule?: WeeklySchedule | null;
  forceClose: boolean;
  forceOpen: boolean;
  pointsPerReal: number;
  receiptCnpj?: string;
  receiptAddress?: string;
  receiptPhone?: string;
  receiptFooter?: string;
  bannerUrl?: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  availabilitySchedule?: WeeklySchedule | null;
  productCount: number;
}

export interface AdminExtra {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminOptionGroupOption {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminOptionGroup {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  isActive: boolean;
  options: AdminOptionGroupOption[];
}

export interface AdminProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  isCompound: boolean;
  categoryId: string;
  categoryName: string;
  sortOrder: number;
  extras: AdminExtra[];
  optionGroups: AdminOptionGroup[];
}

export interface AdminCategoryOption {
  id: string;
  name: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  extras: Array<{ name: string; price: number }> | null;
  groupedExtras?: Array<{ groupName: string; groupId: string; options: Array<{ name: string; price: number }> }> | null;
}

export interface OrderSummary {
  id: string;
  orderNumber?: number;
  customerName: string;
  customerPhone?: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus?: string;
  deliveryType?: string;
  scheduledFor?: string | null;
  itemCount: number;
  items: OrderItem[];
  createdAt: string;
}
