import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminCustomerReadModel } from '../../../src/modules/customers/application/read-models/admin-customer.read-model';
import type { AdjustCustomerLoyaltyResult } from '../../../src/modules/customers/application/use-cases/adjust-customer-loyalty.use-case';
import {
  toAdjustCustomerLoyaltyResponseDto,
  toAdminCustomerResponseDto,
} from '../../../src/modules/admin/admin-customer.mapper';
import {
  AdjustCustomerLoyaltyResponseDto,
  AdjustCustomerLoyaltyTransactionResponseDto,
} from '../../../src/modules/admin/dto/response/adjust-customer-loyalty-response.dto';
import { AdminCustomerResponseDto } from '../../../src/modules/admin/dto/response/admin-customer-response.dto';

test('maps admin customer read models to response DTOs', (): void => {
  const readModel: AdminCustomerReadModel = {
    name: 'Yan',
    phone: '5581999999999',
    hasPassword: true,
    loyaltyPoints: 20,
    isAdmin: false,
    totalOrders: 3,
    memberSince: '2026-05-07T12:00:00.000Z',
  };

  const result = toAdminCustomerResponseDto(readModel);

  assert.ok(result instanceof AdminCustomerResponseDto);
  assert.equal(result.name, 'Yan');
  assert.equal(result.phone, '5581999999999');
  assert.equal(result.hasPassword, true);
  assert.equal(result.loyaltyPoints, 20);
  assert.equal(result.isAdmin, false);
  assert.equal(result.totalOrders, 3);
  assert.equal(result.memberSince, '2026-05-07T12:00:00.000Z');
});

test('maps admin customer loyalty adjustment results to response DTOs', (): void => {
  const adjustment: AdjustCustomerLoyaltyResult = {
    balance: 45,
    transaction: {
      id: 'transaction-1',
      points: 15,
      type: 'adjustment',
    },
  };

  const result = toAdjustCustomerLoyaltyResponseDto(adjustment);

  assert.ok(result instanceof AdjustCustomerLoyaltyResponseDto);
  assert.equal(result.balance, 45);
  assert.ok(result.transaction instanceof AdjustCustomerLoyaltyTransactionResponseDto);
  assert.equal(result.transaction.id, 'transaction-1');
  assert.equal(result.transaction.points, 15);
  assert.equal(result.transaction.type, 'adjustment');
});
