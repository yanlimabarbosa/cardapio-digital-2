import type { IdentifyCustomerResult } from './application/use-cases/identify-customer.use-case';
import type { LoginCustomerResult } from './application/use-cases/login-customer.use-case';
import type { RegisterCustomerResult } from './application/use-cases/register-customer.use-case';
import type { SetCustomerPasswordResult } from './application/use-cases/set-customer-password.use-case';
import type { CustomerLoyaltyReadModel } from './application/read-models/customer-loyalty.read-model';
import type {
  CustomerOrderHistoryOrderReadModel,
  CustomerOrderHistoryPageReadModel,
  CustomerOrderItemExtraReadModel,
  CustomerOrderItemReadModel,
} from './application/read-models/customer-order-history.read-model';
import type { CustomerProfileReadModel } from './application/read-models/customer-profile.read-model';
import type { CustomerRedeemableProductsReadModel } from './application/read-models/customer-redeemable-products.read-model';
import {
  CustomerLoyaltyResponseDto,
  CustomerLoyaltyTransactionResponseDto,
} from './dto/response/customer-loyalty-response.dto';
import {
  CustomerOrderHistoryResponseDto,
  CustomerOrderItemExtraResponseDto,
  CustomerOrderItemResponseDto,
  CustomerOrderResponseDto,
} from './dto/response/customer-order-history-response.dto';
import { CustomerProfileResponseDto } from './dto/response/customer-profile-response.dto';
import {
  CustomerRedeemableProductResponseDto,
  CustomerRedeemableProductsResponseDto,
} from './dto/response/customer-redeemable-products-response.dto';
import {
  IdentifyCustomerActionDto,
  IdentifyCustomerResponseDto,
  IdentifyCustomerSummaryResponseDto,
} from './dto/response/identify-customer-response.dto';
import {
  RegisteredCustomerResponseDto,
  RegisterCustomerResponseDto,
} from './dto/response/register-customer-response.dto';
import {
  LoggedInCustomerResponseDto,
  LoginCustomerResponseDto,
} from './dto/response/login-customer-response.dto';
import {
  PasswordCustomerResponseDto,
  SetCustomerPasswordResponseDto,
} from './dto/response/set-customer-password-response.dto';

export function toIdentifyCustomerResponseDto(result: IdentifyCustomerResult): IdentifyCustomerResponseDto {
  if (result.action === 'register') {
    return new IdentifyCustomerResponseDto(false, IdentifyCustomerActionDto.Register);
  }

  if (result.action === 'login') {
    return new IdentifyCustomerResponseDto(true, IdentifyCustomerActionDto.Login, true);
  }

  return new IdentifyCustomerResponseDto(
    true,
    IdentifyCustomerActionDto.Authenticated,
    false,
    result.token,
    new IdentifyCustomerSummaryResponseDto(
      result.customer.name,
      result.customer.phone,
      result.customer.hasPassword,
      result.customer.loyaltyPoints,
      result.customer.isAdmin,
    ),
  );
}

export function toRegisterCustomerResponseDto(result: RegisterCustomerResult): RegisterCustomerResponseDto {
  return new RegisterCustomerResponseDto(
    result.token,
    new RegisteredCustomerResponseDto(
      result.customer.name,
      result.customer.phone,
      result.customer.hasPassword,
      result.customer.loyaltyPoints,
      result.customer.isAdmin,
    ),
  );
}

export function toLoginCustomerResponseDto(result: LoginCustomerResult): LoginCustomerResponseDto {
  return new LoginCustomerResponseDto(
    result.token,
    new LoggedInCustomerResponseDto(
      result.customer.name,
      result.customer.phone,
      result.customer.hasPassword,
      result.customer.loyaltyPoints,
      result.customer.isAdmin,
    ),
  );
}

export function toSetCustomerPasswordResponseDto(
  result: SetCustomerPasswordResult,
): SetCustomerPasswordResponseDto {
  return new SetCustomerPasswordResponseDto(
    new PasswordCustomerResponseDto(
      result.customer.name,
      result.customer.phone,
      result.customer.hasPassword,
      result.customer.loyaltyPoints,
      result.customer.isAdmin,
    ),
  );
}

export function toCustomerLoyaltyResponseDto(loyalty: CustomerLoyaltyReadModel): CustomerLoyaltyResponseDto {
  return new CustomerLoyaltyResponseDto(
    loyalty.balance,
    loyalty.transactions.map(
      (transaction) =>
        new CustomerLoyaltyTransactionResponseDto(
          transaction.id,
          transaction.points,
          transaction.type,
          transaction.description,
          transaction.createdAt,
        ),
    ),
    loyalty.total,
    loyalty.page,
    loyalty.totalPages,
  );
}

export function toCustomerOrderHistoryResponseDto(
  history: CustomerOrderHistoryPageReadModel,
): CustomerOrderHistoryResponseDto {
  return new CustomerOrderHistoryResponseDto(
    history.orders.map(toCustomerOrderResponseDto),
    history.total,
    history.page,
    history.totalPages,
  );
}

export function toCustomerRedeemableProductsResponseDto(
  redeemableProducts: CustomerRedeemableProductsReadModel,
): CustomerRedeemableProductsResponseDto {
  return new CustomerRedeemableProductsResponseDto(
    redeemableProducts.balance,
    redeemableProducts.products.map(
      (product) =>
        new CustomerRedeemableProductResponseDto(
          product.id,
          product.name,
          product.imageUrl,
          product.price,
          product.redemptionCost,
          product.canRedeem,
        ),
    ),
  );
}

export function toCustomerProfileResponseDto(profile: CustomerProfileReadModel): CustomerProfileResponseDto {
  return new CustomerProfileResponseDto(
    profile.name,
    profile.phone,
    profile.hasPassword,
    profile.loyaltyPoints,
    profile.isAdmin,
    profile.totalOrders,
    profile.memberSince,
  );
}

function toCustomerOrderResponseDto(
  order: CustomerOrderHistoryOrderReadModel,
): CustomerOrderResponseDto {
  return new CustomerOrderResponseDto(
    order.id,
    order.orderNumber,
    order.customerName,
    order.status,
    order.totalAmount,
    order.deliveryFee,
    order.paymentMethod,
    order.paymentStatus,
    order.deliveryType,
    order.scheduledFor,
    order.items.map(toCustomerOrderItemResponseDto),
    order.createdAt,
  );
}

function toCustomerOrderItemResponseDto(item: CustomerOrderItemReadModel): CustomerOrderItemResponseDto {
  return new CustomerOrderItemResponseDto(
    item.id,
    item.productName,
    item.unitPrice,
    item.quantity,
    item.subtotal,
    toCustomerOrderItemExtrasResponseDto(item.extras),
  );
}

function toCustomerOrderItemExtrasResponseDto(
  extras: readonly CustomerOrderItemExtraReadModel[] | null | undefined,
): CustomerOrderItemExtraResponseDto[] | null | undefined {
  if (extras === null) {
    return null;
  }

  return extras?.map(toCustomerOrderItemExtraResponseDto);
}

function toCustomerOrderItemExtraResponseDto(
  extra: CustomerOrderItemExtraReadModel,
): CustomerOrderItemExtraResponseDto {
  return new CustomerOrderItemExtraResponseDto(extra.name, extra.price);
}
