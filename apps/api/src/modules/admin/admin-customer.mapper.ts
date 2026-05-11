import type { AdjustCustomerLoyaltyResult } from '../customers/application/use-cases/adjust-customer-loyalty.use-case';
import type { AdminCustomerReadModel } from '../customers/application/read-models/admin-customer.read-model';
import {
  AdjustCustomerLoyaltyResponseDto,
  AdjustCustomerLoyaltyTransactionResponseDto,
} from './dto/response/adjust-customer-loyalty-response.dto';
import { AdminCustomerResponseDto } from './dto/response/admin-customer-response.dto';

export function toAdminCustomerResponseDto(customer: AdminCustomerReadModel): AdminCustomerResponseDto {
  return new AdminCustomerResponseDto(
    customer.name,
    customer.phone,
    customer.hasPassword,
    customer.loyaltyPoints,
    customer.isAdmin,
    customer.totalOrders,
    customer.memberSince,
  );
}

export function toAdjustCustomerLoyaltyResponseDto(
  result: AdjustCustomerLoyaltyResult,
): AdjustCustomerLoyaltyResponseDto {
  return new AdjustCustomerLoyaltyResponseDto(
    result.balance,
    new AdjustCustomerLoyaltyTransactionResponseDto(
      result.transaction.id,
      result.transaction.points,
      result.transaction.type,
    ),
  );
}
