import type {
  AdminProductExtraReadModel,
  AdminProductOptionGroupReadModel,
  AdminProductReadModel,
} from './application/read-models/admin-product.read-model';
import type { AdminFeaturedProductReadModel } from './application/read-models/admin-featured-product.read-model';
import type { AdminOptionGroupReadModel } from './application/read-models/admin-option-group.read-model';
import type { AdminProductExtraListReadModel } from './application/read-models/admin-product-extra.read-model';
import type { AdminProductExtraMutationModel } from './application/ports/admin-product-extra-write.repository.port';
import type { AdminProductMutationModel } from './application/ports/admin-product-write.repository.port';
import { AdminFeaturedProductResponseDto } from './dto/response/admin-featured-product-response.dto';
import { AdminGroupOptionMutationResponseDto } from './dto/response/admin-group-option-mutation-response.dto';
import { AdminProductExtraMutationResponseDto } from './dto/response/admin-product-extra-mutation-response.dto';
import { AdminProductExtraListResponseDto } from './dto/response/admin-product-extra-response.dto';
import {
  AdminProductMutationCategoryResponseDto,
  AdminProductMutationResponseDto,
} from './dto/response/admin-product-mutation-response.dto';
import {
  AdminProductCombinedLimitResponseDto,
  AdminProductExtraResponseDto,
  AdminProductOptionGroupResponseDto,
  AdminProductResponseDto,
} from './dto/response/admin-product-response.dto';
import type { AdminProductCombinedLimitReadModel } from './application/read-models/admin-product.read-model';

export function toAdminProductResponseDto(product: AdminProductReadModel): AdminProductResponseDto {
  return new AdminProductResponseDto(
    product.id,
    product.name,
    product.description,
    product.price,
    product.imageUrl,
    product.isActive,
    product.isSoldOut,
    product.isCompound,
    product.categoryId,
    product.categoryName,
    product.extras.map(toAdminProductExtraResponseDto),
    product.optionGroups.map(toAdminProductOptionGroupResponseDto),
    product.combinedLimits.map(toAdminProductCombinedLimitResponseDto),
    product.sortOrder,
    product.isRedeemable,
    product.redemptionCost,
    product.createdAt,
  );
}

export function toAdminFeaturedProductResponseDto(
  product: AdminFeaturedProductReadModel,
): AdminFeaturedProductResponseDto {
  return new AdminFeaturedProductResponseDto(
    product.id,
    product.name,
    product.price,
    product.imageUrl,
    product.categoryName,
    product.featuredOrder,
  );
}

export function toAdminProductExtraListResponseDto(
  extra: AdminProductExtraListReadModel,
): AdminProductExtraListResponseDto {
  return new AdminProductExtraListResponseDto(
    extra.id,
    extra.name,
    extra.price,
    extra.imageUrl,
    extra.isActive,
    extra.isSoldOut,
  );
}

export function toAdminProductExtraMutationResponseDto(
  extra: AdminProductExtraMutationModel,
): AdminProductExtraMutationResponseDto {
  return new AdminProductExtraMutationResponseDto(
    extra.id,
    extra.name,
    extra.price,
    extra.imageUrl,
    extra.sortOrder,
    extra.isActive,
    extra.isSoldOut,
  );
}

export function toAdminGroupOptionResponseDto(
  extra: AdminProductExtraMutationModel,
): AdminProductExtraResponseDto {
  return new AdminProductExtraResponseDto(
    extra.id,
    extra.name,
    Number.parseFloat(extra.price),
    extra.imageUrl,
    extra.sortOrder,
    extra.isActive,
    extra.isSoldOut,
  );
}

export function toAdminGroupOptionMutationResponseDto(
  extra: AdminProductExtraMutationModel,
): AdminGroupOptionMutationResponseDto {
  return new AdminGroupOptionMutationResponseDto(
    extra.id,
    extra.name,
    extra.price,
    extra.imageUrl,
    extra.sortOrder,
    extra.isActive,
    extra.isSoldOut,
  );
}

export function toAdminProductMutationResponseDto(
  product: AdminProductMutationModel,
): AdminProductMutationResponseDto {
  return new AdminProductMutationResponseDto(
    product.id,
    new AdminProductMutationCategoryResponseDto(product.category.id, product.category.name),
    product.name,
    product.description,
    product.price,
    product.imageUrl,
    product.sortOrder,
    product.isActive,
    product.isSoldOut,
    product.isFeatured,
    product.featuredOrder,
    product.isPromotional,
    product.promotionalPrice,
    product.promotionStartDate,
    product.promotionEndDate,
    product.isCompound,
    product.isRedeemable,
    product.redemptionCost,
    product.createdAt,
    product.updatedAt,
  );
}

export function toAdminProductOptionGroupResponseDto(
  group: AdminOptionGroupReadModel | AdminProductOptionGroupReadModel,
): AdminProductOptionGroupResponseDto {
  return new AdminProductOptionGroupResponseDto(
    group.id,
    group.name,
    group.minSelections,
    group.maxSelections,
    group.sortOrder,
    group.isActive,
    group.options.map(toAdminProductExtraResponseDto),
    group.combinedLimitId,
  );
}

function toAdminProductCombinedLimitResponseDto(
  limit: AdminProductCombinedLimitReadModel,
): AdminProductCombinedLimitResponseDto {
  return new AdminProductCombinedLimitResponseDto(limit.id, limit.name, limit.maxSelections);
}

function toAdminProductExtraResponseDto(extra: AdminProductExtraReadModel): AdminProductExtraResponseDto {
  return new AdminProductExtraResponseDto(
    extra.id,
    extra.name,
    extra.price,
    extra.imageUrl,
    extra.sortOrder,
    extra.isActive,
    extra.isSoldOut,
  );
}
