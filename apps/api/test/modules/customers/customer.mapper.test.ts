import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@cardapio/shared';
import type { IdentifyCustomerResult } from '../../../src/modules/customers/application/use-cases/identify-customer.use-case';
import type { LoginCustomerResult } from '../../../src/modules/customers/application/use-cases/login-customer.use-case';
import type { RegisterCustomerResult } from '../../../src/modules/customers/application/use-cases/register-customer.use-case';
import type { SetCustomerPasswordResult } from '../../../src/modules/customers/application/use-cases/set-customer-password.use-case';
import type { CustomerLoyaltyReadModel } from '../../../src/modules/customers/application/read-models/customer-loyalty.read-model';
import type { CustomerOrderHistoryPageReadModel } from '../../../src/modules/customers/application/read-models/customer-order-history.read-model';
import type { CustomerProfileReadModel } from '../../../src/modules/customers/application/read-models/customer-profile.read-model';
import type { CustomerRedeemableProductsReadModel } from '../../../src/modules/customers/application/read-models/customer-redeemable-products.read-model';
import {
  toCustomerLoyaltyResponseDto,
  toCustomerOrderHistoryResponseDto,
  toCustomerProfileResponseDto,
  toCustomerRedeemableProductsResponseDto,
  toIdentifyCustomerResponseDto,
  toLoginCustomerResponseDto,
  toRegisterCustomerResponseDto,
  toSetCustomerPasswordResponseDto,
} from '../../../src/modules/customers/customer.mapper';
import { CustomerProfileResponseDto } from '../../../src/modules/customers/dto/response/customer-profile-response.dto';
import {
  IdentifyCustomerActionDto,
  IdentifyCustomerResponseDto,
  IdentifyCustomerSummaryResponseDto,
} from '../../../src/modules/customers/dto/response/identify-customer-response.dto';
import {
  RegisteredCustomerResponseDto,
  RegisterCustomerResponseDto,
} from '../../../src/modules/customers/dto/response/register-customer-response.dto';
import {
  LoggedInCustomerResponseDto,
  LoginCustomerResponseDto,
} from '../../../src/modules/customers/dto/response/login-customer-response.dto';
import {
  PasswordCustomerResponseDto,
  SetCustomerPasswordResponseDto,
} from '../../../src/modules/customers/dto/response/set-customer-password-response.dto';
import {
  CustomerLoyaltyResponseDto,
  CustomerLoyaltyTransactionResponseDto,
} from '../../../src/modules/customers/dto/response/customer-loyalty-response.dto';
import {
  CustomerOrderHistoryResponseDto,
  CustomerOrderItemExtraResponseDto,
  CustomerOrderItemResponseDto,
  CustomerOrderResponseDto,
} from '../../../src/modules/customers/dto/response/customer-order-history-response.dto';
import {
  CustomerRedeemableProductResponseDto,
  CustomerRedeemableProductsResponseDto,
} from '../../../src/modules/customers/dto/response/customer-redeemable-products-response.dto';

test('maps identify register results to response DTOs', (): void => {
  const result = toIdentifyCustomerResponseDto({ exists: false, action: 'register' });

  assert.ok(result instanceof IdentifyCustomerResponseDto);
  assert.equal(result.exists, false);
  assert.equal(result.action, IdentifyCustomerActionDto.Register);
  assert.equal(result.hasPassword, undefined);
  assert.equal(result.token, undefined);
  assert.equal(result.customer, undefined);
});

test('maps identify login results to response DTOs', (): void => {
  const result = toIdentifyCustomerResponseDto({
    exists: true,
    hasPassword: true,
    action: 'login',
  });

  assert.ok(result instanceof IdentifyCustomerResponseDto);
  assert.equal(result.exists, true);
  assert.equal(result.action, IdentifyCustomerActionDto.Login);
  assert.equal(result.hasPassword, true);
  assert.equal(result.token, undefined);
  assert.equal(result.customer, undefined);
});

test('maps identify authenticated results to response DTOs', (): void => {
  const identifyResult: IdentifyCustomerResult = {
    exists: true,
    hasPassword: false,
    action: 'authenticated',
    token: 'customer-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: false,
      loyaltyPoints: 30,
      isAdmin: false,
    },
  };

  const result = toIdentifyCustomerResponseDto(identifyResult);

  assert.ok(result instanceof IdentifyCustomerResponseDto);
  assert.equal(result.exists, true);
  assert.equal(result.action, IdentifyCustomerActionDto.Authenticated);
  assert.equal(result.hasPassword, false);
  assert.equal(result.token, 'customer-token');
  const customer = result.customer;
  assert.ok(customer instanceof IdentifyCustomerSummaryResponseDto);
  assert.equal(customer.name, 'Yan');
  assert.equal(customer.phone, '81999990000');
  assert.equal(customer.hasPassword, false);
  assert.equal(customer.loyaltyPoints, 30);
  assert.equal(customer.isAdmin, false);
});

test('maps register customer results to response DTOs', (): void => {
  const registerResult: RegisterCustomerResult = {
    token: 'customer-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 0,
      isAdmin: true,
    },
  };

  const result = toRegisterCustomerResponseDto(registerResult);

  assert.ok(result instanceof RegisterCustomerResponseDto);
  assert.equal(result.token, 'customer-token');
  assert.ok(result.customer instanceof RegisteredCustomerResponseDto);
  assert.equal(result.customer.name, 'Yan');
  assert.equal(result.customer.phone, '81999990000');
  assert.equal(result.customer.hasPassword, true);
  assert.equal(result.customer.loyaltyPoints, 0);
  assert.equal(result.customer.isAdmin, true);
});

test('maps login customer results to response DTOs', (): void => {
  const loginResult: LoginCustomerResult = {
    token: 'customer-token',
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 30,
      isAdmin: true,
    },
  };

  const result = toLoginCustomerResponseDto(loginResult);

  assert.ok(result instanceof LoginCustomerResponseDto);
  assert.equal(result.token, 'customer-token');
  assert.ok(result.customer instanceof LoggedInCustomerResponseDto);
  assert.equal(result.customer.name, 'Yan');
  assert.equal(result.customer.phone, '81999990000');
  assert.equal(result.customer.hasPassword, true);
  assert.equal(result.customer.loyaltyPoints, 30);
  assert.equal(result.customer.isAdmin, true);
});

test('maps set customer password results to response DTOs', (): void => {
  const setPasswordResult: SetCustomerPasswordResult = {
    customer: {
      name: 'Yan',
      phone: '81999990000',
      hasPassword: true,
      loyaltyPoints: 30,
      isAdmin: false,
    },
  };

  const result = toSetCustomerPasswordResponseDto(setPasswordResult);

  assert.ok(result instanceof SetCustomerPasswordResponseDto);
  assert.ok(result.customer instanceof PasswordCustomerResponseDto);
  assert.equal(result.customer.name, 'Yan');
  assert.equal(result.customer.phone, '81999990000');
  assert.equal(result.customer.hasPassword, true);
  assert.equal(result.customer.loyaltyPoints, 30);
  assert.equal(result.customer.isAdmin, false);
});

test('maps customer loyalty read models to response DTOs', (): void => {
  const loyalty: CustomerLoyaltyReadModel = {
    balance: 30,
    transactions: [
      {
        id: 'transaction-1',
        points: 10,
        type: 'earn',
        description: 'Pedido #1',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
      {
        id: 'transaction-2',
        points: -5,
        type: 'redeem',
        description: null,
        createdAt: '2026-05-06T12:00:00.000Z',
      },
    ],
    total: 2,
    page: 1,
    totalPages: 1,
  };

  const result = toCustomerLoyaltyResponseDto(loyalty);

  assert.ok(result instanceof CustomerLoyaltyResponseDto);
  assert.equal(result.balance, 30);
  assert.equal(result.transactions.length, 2);
  assert.ok(result.transactions[0] instanceof CustomerLoyaltyTransactionResponseDto);
  assert.equal(result.transactions[0]?.id, 'transaction-1');
  assert.equal(result.transactions[0]?.description, 'Pedido #1');
  assert.equal(result.transactions[1]?.description, null);
  assert.equal(result.total, 2);
  assert.equal(result.page, 1);
  assert.equal(result.totalPages, 1);
});

test('maps customer order history read models to response DTOs', (): void => {
  const history: CustomerOrderHistoryPageReadModel = {
    orders: [
      {
        id: 'order-1',
        orderNumber: 42,
        customerName: 'Yan',
        status: OrderStatus.PAID,
        totalAmount: 25,
        deliveryFee: 5,
        paymentMethod: PaymentMethod.PIX,
        paymentStatus: PaymentStatus.APPROVED,
        deliveryType: 'delivery',
        scheduledFor: '2026-05-07T15:00:00.000Z',
        items: [
          {
            id: 'item-1',
            productName: 'Quentinha',
            unitPrice: 17,
            quantity: 1,
            subtotal: 20,
            extras: [{ name: 'Farofa', price: 3 }],
          },
        ],
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    ],
    total: 3,
    page: 2,
    totalPages: 2,
  };

  const result = toCustomerOrderHistoryResponseDto(history);

  assert.ok(result instanceof CustomerOrderHistoryResponseDto);
  assert.equal(result.total, 3);
  assert.equal(result.page, 2);
  assert.equal(result.totalPages, 2);
  assert.equal(result.orders.length, 1);
  const order = result.orders[0];
  assert.ok(order instanceof CustomerOrderResponseDto);
  assert.equal(order?.id, 'order-1');
  assert.equal(order?.status, OrderStatus.PAID);
  assert.equal(order?.paymentStatus, PaymentStatus.APPROVED);
  assert.equal(order?.items.length, 1);
  const item = order?.items[0];
  assert.ok(item instanceof CustomerOrderItemResponseDto);
  assert.equal(item?.productName, 'Quentinha');
  assert.equal(item?.extras?.length, 1);
  assert.ok(item?.extras?.[0] instanceof CustomerOrderItemExtraResponseDto);
  assert.equal(item?.extras?.[0]?.name, 'Farofa');
});

test('maps customer redeemable product read models to response DTOs', (): void => {
  const redeemableProducts: CustomerRedeemableProductsReadModel = {
    balance: 100,
    products: [
      {
        id: 'product-1',
        name: 'Brownie',
        imageUrl: 'https://example.com/brownie.png',
        price: 12.5,
        redemptionCost: 80,
        canRedeem: true,
      },
    ],
  };

  const result = toCustomerRedeemableProductsResponseDto(redeemableProducts);

  assert.ok(result instanceof CustomerRedeemableProductsResponseDto);
  assert.equal(result.balance, 100);
  assert.equal(result.products.length, 1);
  const product = result.products[0];
  assert.ok(product instanceof CustomerRedeemableProductResponseDto);
  assert.equal(product?.id, 'product-1');
  assert.equal(product?.name, 'Brownie');
  assert.equal(product?.imageUrl, 'https://example.com/brownie.png');
  assert.equal(product?.price, 12.5);
  assert.equal(product?.redemptionCost, 80);
  assert.equal(product?.canRedeem, true);
});

test('maps customer profile read models to response DTOs', (): void => {
  const profile: CustomerProfileReadModel = {
    name: 'Yan',
    phone: '5581999999999',
    hasPassword: true,
    loyaltyPoints: 20,
    isAdmin: true,
    totalOrders: 3,
    memberSince: '2026-05-07T12:00:00.000Z',
  };

  const result = toCustomerProfileResponseDto(profile);

  assert.ok(result instanceof CustomerProfileResponseDto);
  assert.equal(result.name, 'Yan');
  assert.equal(result.phone, '5581999999999');
  assert.equal(result.hasPassword, true);
  assert.equal(result.loyaltyPoints, 20);
  assert.equal(result.isAdmin, true);
  assert.equal(result.totalOrders, 3);
  assert.equal(result.memberSince, '2026-05-07T12:00:00.000Z');
});
