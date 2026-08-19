import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { AdminProductMutationModel } from '../../../src/modules/admin/application/ports/admin-product-write.repository.port';
import type { AdminProductExtraMutationModel } from '../../../src/modules/admin/application/ports/admin-product-extra-write.repository.port';
import type { AdminFeaturedProductReadModel } from '../../../src/modules/admin/application/read-models/admin-featured-product.read-model';
import type { AdminOptionGroupReadModel } from '../../../src/modules/admin/application/read-models/admin-option-group.read-model';
import type { AdminProductExtraListReadModel } from '../../../src/modules/admin/application/read-models/admin-product-extra.read-model';
import type { AdminProductReadModel } from '../../../src/modules/admin/application/read-models/admin-product.read-model';
import {
  toAdminFeaturedProductResponseDto,
  toAdminGroupOptionMutationResponseDto,
  toAdminGroupOptionResponseDto,
  toAdminProductOptionGroupResponseDto,
  toAdminProductExtraListResponseDto,
  toAdminProductExtraMutationResponseDto,
  toAdminProductMutationResponseDto,
  toAdminProductResponseDto,
} from '../../../src/modules/admin/admin-product.mapper';
import { AdminFeaturedProductResponseDto } from '../../../src/modules/admin/dto/response/admin-featured-product-response.dto';
import { AdminGroupOptionMutationResponseDto } from '../../../src/modules/admin/dto/response/admin-group-option-mutation-response.dto';
import { AdminProductExtraMutationResponseDto } from '../../../src/modules/admin/dto/response/admin-product-extra-mutation-response.dto';
import { AdminProductExtraListResponseDto } from '../../../src/modules/admin/dto/response/admin-product-extra-response.dto';
import {
  AdminProductMutationCategoryResponseDto,
  AdminProductMutationResponseDto,
} from '../../../src/modules/admin/dto/response/admin-product-mutation-response.dto';
import {
  AdminProductExtraResponseDto,
  AdminProductOptionGroupResponseDto,
  AdminProductResponseDto,
} from '../../../src/modules/admin/dto/response/admin-product-response.dto';

test('maps admin product read models to response DTOs', (): void => {
  const createdAt = new Date('2026-05-07T12:00:00.000Z');
  const readModel: AdminProductReadModel = {
    id: 'product-1',
    name: 'Quentinha',
    description: 'Lunch',
    price: 17.5,
    imageUrl: '/uploads/quentinha.webp',
    isActive: true,
    isSoldOut: false,
    isCompound: true,
    categoryId: 'category-1',
    categoryName: 'Lunch',
    combinedLimits: [],
    extras: [
      {
        id: 'extra-1',
        name: 'Farofa',
        price: 2.5,
        imageUrl: '/uploads/farofa.webp',
        sortOrder: 0,
        isActive: true,
        isSoldOut: false,
      },
    ],
    optionGroups: [
      {
        id: 'group-1',
        combinedLimitId: null,
        name: 'Carne',
        minSelections: 1,
        maxSelections: 2,
        sortOrder: 0,
        isActive: true,
        options: [
          {
            id: 'option-1',
            name: 'Bife',
            price: 5,
            imageUrl: undefined,
            sortOrder: 0,
            isActive: true,
            isSoldOut: false,
          },
        ],
      },
    ],
    sortOrder: 1,
    isRedeemable: true,
    redemptionCost: 10,
    createdAt,
  };

  const result = toAdminProductResponseDto(readModel);

  assert.ok(result instanceof AdminProductResponseDto);
  assert.ok(result.extras[0] instanceof AdminProductExtraResponseDto);
  assert.ok(result.optionGroups[0] instanceof AdminProductOptionGroupResponseDto);
  assert.ok(result.optionGroups[0]?.options[0] instanceof AdminProductExtraResponseDto);
  assert.equal(result.id, 'product-1');
  assert.equal(result.name, 'Quentinha');
  assert.equal(result.description, 'Lunch');
  assert.equal(result.price, 17.5);
  assert.equal(result.imageUrl, '/uploads/quentinha.webp');
  assert.equal(result.isActive, true);
  assert.equal(result.isSoldOut, false);
  assert.equal(result.isCompound, true);
  assert.equal(result.categoryId, 'category-1');
  assert.equal(result.categoryName, 'Lunch');
  assert.equal(result.extras[0]?.name, 'Farofa');
  assert.equal(result.optionGroups[0]?.name, 'Carne');
  assert.equal(result.optionGroups[0]?.options[0]?.name, 'Bife');
  assert.equal(result.sortOrder, 1);
  assert.equal(result.isRedeemable, true);
  assert.equal(result.redemptionCost, 10);
  assert.equal(result.createdAt, createdAt);
});

test('maps admin product mutation models to response DTOs', (): void => {
  const createdAt = new Date('2026-05-07T12:00:00.000Z');
  const updatedAt = new Date('2026-05-07T12:30:00.000Z');
  const promotionStartDate = new Date('2026-05-08T12:00:00.000Z');
  const mutationModel: AdminProductMutationModel = {
    id: 'product-1',
    category: { id: 'category-1', name: 'Lunch' },
    name: 'Quentinha',
    description: 'Lunch',
    price: '17.50',
    imageUrl: '/uploads/quentinha.webp',
    sortOrder: 1,
    isActive: true,
    isSoldOut: false,
    isFeatured: true,
    featuredOrder: 2,
    isPromotional: true,
    promotionalPrice: '15.00',
    promotionStartDate,
    promotionEndDate: undefined,
    isCompound: true,
    isRedeemable: true,
    redemptionCost: 10,
    createdAt,
    updatedAt,
  };

  const result = toAdminProductMutationResponseDto(mutationModel);

  assert.ok(result instanceof AdminProductMutationResponseDto);
  assert.ok(result.category instanceof AdminProductMutationCategoryResponseDto);
  assert.equal(result.id, 'product-1');
  assert.equal(result.category.id, 'category-1');
  assert.equal(result.category.name, 'Lunch');
  assert.equal(result.name, 'Quentinha');
  assert.equal(result.description, 'Lunch');
  assert.equal(result.price, '17.50');
  assert.equal(result.imageUrl, '/uploads/quentinha.webp');
  assert.equal(result.sortOrder, 1);
  assert.equal(result.isActive, true);
  assert.equal(result.isSoldOut, false);
  assert.equal(result.isFeatured, true);
  assert.equal(result.featuredOrder, 2);
  assert.equal(result.isPromotional, true);
  assert.equal(result.promotionalPrice, '15.00');
  assert.equal(result.promotionStartDate, promotionStartDate);
  assert.equal(result.promotionEndDate, undefined);
  assert.equal(result.isCompound, true);
  assert.equal(result.isRedeemable, true);
  assert.equal(result.redemptionCost, 10);
  assert.equal(result.createdAt, createdAt);
  assert.equal(result.updatedAt, updatedAt);
});

test('maps featured admin product read models to response DTOs', (): void => {
  const readModel: AdminFeaturedProductReadModel = {
    id: 'product-1',
    name: 'Quentinha',
    price: 17.5,
    imageUrl: '/uploads/quentinha.webp',
    categoryName: 'Lunch',
    featuredOrder: 2,
  };

  const result = toAdminFeaturedProductResponseDto(readModel);

  assert.ok(result instanceof AdminFeaturedProductResponseDto);
  assert.equal(result.id, 'product-1');
  assert.equal(result.name, 'Quentinha');
  assert.equal(result.price, 17.5);
  assert.equal(result.imageUrl, '/uploads/quentinha.webp');
  assert.equal(result.categoryName, 'Lunch');
  assert.equal(result.featuredOrder, 2);
});

test('maps admin product extra list read models to response DTOs', (): void => {
  const readModel: AdminProductExtraListReadModel = {
    id: 'extra-1',
    name: 'Farofa',
    price: 2.5,
    imageUrl: '/uploads/farofa.webp',
    isActive: true,
    isSoldOut: false,
  };

  const result = toAdminProductExtraListResponseDto(readModel);

  assert.ok(result instanceof AdminProductExtraListResponseDto);
  assert.equal(result.id, 'extra-1');
  assert.equal(result.name, 'Farofa');
  assert.equal(result.price, 2.5);
  assert.equal(result.imageUrl, '/uploads/farofa.webp');
  assert.equal(result.isActive, true);
  assert.equal(result.isSoldOut, false);
});

test('maps admin option group read models to response DTOs', (): void => {
  const readModel: AdminOptionGroupReadModel = {
    id: 'group-1',
    combinedLimitId: null,
    name: 'Carne',
    minSelections: 1,
    maxSelections: 2,
    sortOrder: 0,
    isActive: true,
    options: [
      {
        id: 'option-1',
        name: 'Bife',
        price: 5,
        imageUrl: undefined,
        sortOrder: 0,
        isActive: true,
        isSoldOut: false,
      },
    ],
  };

  const result = toAdminProductOptionGroupResponseDto(readModel);

  assert.ok(result instanceof AdminProductOptionGroupResponseDto);
  assert.ok(result.options[0] instanceof AdminProductExtraResponseDto);
  assert.equal(result.id, 'group-1');
  assert.equal(result.name, 'Carne');
  assert.equal(result.minSelections, 1);
  assert.equal(result.maxSelections, 2);
  assert.equal(result.sortOrder, 0);
  assert.equal(result.isActive, true);
  assert.equal(result.options[0]?.name, 'Bife');
});

test('maps admin product extra mutation models to response DTOs', (): void => {
  const mutationModel: AdminProductExtraMutationModel = {
    id: 'extra-1',
    name: 'Farofa',
    price: '2.50',
    imageUrl: '/uploads/farofa.webp',
    sortOrder: 0,
    isActive: true,
    isSoldOut: false,
  };

  const result = toAdminProductExtraMutationResponseDto(mutationModel);

  assert.ok(result instanceof AdminProductExtraMutationResponseDto);
  assert.equal(result.id, 'extra-1');
  assert.equal(result.name, 'Farofa');
  assert.equal(result.price, '2.50');
  assert.equal(result.imageUrl, '/uploads/farofa.webp');
  assert.equal(result.sortOrder, 0);
  assert.equal(result.isActive, true);
  assert.equal(result.isSoldOut, false);
});

test('maps admin group option mutation models to numeric-price response DTOs', (): void => {
  const mutationModel: AdminProductExtraMutationModel = {
    id: 'option-1',
    name: 'Bife',
    price: '3.50',
    imageUrl: '/uploads/bife.webp',
    sortOrder: 2,
    isActive: true,
    isSoldOut: false,
  };

  const result = toAdminGroupOptionResponseDto(mutationModel);

  assert.ok(result instanceof AdminProductExtraResponseDto);
  assert.equal(result.id, 'option-1');
  assert.equal(result.name, 'Bife');
  assert.equal(result.price, 3.5);
  assert.equal(result.imageUrl, '/uploads/bife.webp');
  assert.equal(result.sortOrder, 2);
  assert.equal(result.isActive, true);
  assert.equal(result.isSoldOut, false);
});

test('maps admin group option updates to mutation response DTOs with string prices', (): void => {
  const mutationModel: AdminProductExtraMutationModel = {
    id: 'option-1',
    name: 'Bife',
    price: '3.50',
    imageUrl: '/uploads/bife.webp',
    sortOrder: 2,
    isActive: true,
    isSoldOut: false,
  };

  const result = toAdminGroupOptionMutationResponseDto(mutationModel);

  assert.ok(result instanceof AdminGroupOptionMutationResponseDto);
  assert.equal(result.id, 'option-1');
  assert.equal(result.name, 'Bife');
  assert.equal(result.price, '3.50');
  assert.equal(result.imageUrl, '/uploads/bife.webp');
  assert.equal(result.sortOrder, 2);
  assert.equal(result.isActive, true);
  assert.equal(result.isSoldOut, false);
});
