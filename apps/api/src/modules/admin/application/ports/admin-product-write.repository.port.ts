import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ADMIN_PRODUCT_WRITE_REPOSITORY = Symbol('ADMIN_PRODUCT_WRITE_REPOSITORY');

export type ReorderAdminProductItem = {
  readonly id: string;
  readonly sortOrder: number;
};

export type AdminProductActiveState = {
  readonly id: string;
  readonly isActive: boolean;
};

export type AdminProductMutationCategoryModel = {
  readonly id: string;
  readonly name: string;
};

export type AdminProductMutationModel = {
  readonly category: AdminProductMutationCategoryModel;
  readonly createdAt?: Date;
  readonly description?: string;
  readonly featuredOrder: number;
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly isCompound: boolean;
  readonly isFeatured: boolean;
  readonly isPromotional: boolean;
  readonly isRedeemable: boolean;
  readonly name: string;
  readonly price: string;
  readonly promotionalPrice?: string;
  readonly promotionEndDate?: Date;
  readonly promotionStartDate?: Date;
  readonly redemptionCost: number;
  readonly sortOrder: number;
  readonly updatedAt?: Date;
};

export type CreateAdminProductData = {
  readonly categoryId: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly isCompound?: boolean;
  readonly isRedeemable?: boolean;
  readonly name: string;
  readonly price: number;
  readonly redemptionCost?: number;
};

export type CreateAdminProductOutcome =
  | { readonly categoryId: string; readonly status: 'category-not-found' }
  | { readonly product: AdminProductMutationModel; readonly status: 'created' };

export type UpdateAdminProductData = {
  readonly categoryId?: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly isActive?: boolean;
  readonly isCompound?: boolean;
  readonly isPromotional?: boolean;
  readonly isRedeemable?: boolean;
  readonly name?: string;
  readonly price?: number;
  readonly promotionalPrice?: number | null;
  readonly promotionEndDate?: string | null;
  readonly promotionStartDate?: string | null;
  readonly redemptionCost?: number;
};

export type UpdateAdminProductOutcome =
  | { readonly categoryId: string; readonly status: 'category-not-found' }
  | { readonly status: 'product-not-found' }
  | { readonly product: AdminProductMutationModel; readonly status: 'updated' };

export interface AdminProductWriteRepository {
  create(
    data: CreateAdminProductData,
    context: TransactionContext,
  ): Promise<CreateAdminProductOutcome>;
  reorder(items: readonly ReorderAdminProductItem[], context: TransactionContext): Promise<void>;
  setFeatured(productIds: readonly string[], context: TransactionContext): Promise<void>;
  softDelete(id: string, context: TransactionContext): Promise<boolean>;
  toggleActive(id: string, context: TransactionContext): Promise<AdminProductActiveState | null>;
  update(
    id: string,
    data: UpdateAdminProductData,
    context: TransactionContext,
  ): Promise<UpdateAdminProductOutcome>;
}
