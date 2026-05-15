import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY = Symbol('ADMIN_PRODUCT_EXTRA_WRITE_REPOSITORY');

export type AdminProductExtraMutationModel = {
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly isSoldOut: boolean;
  readonly name: string;
  readonly price: string;
  readonly sortOrder: number;
};

export type CreateAdminProductExtraData = {
  readonly imageUrl?: string;
  readonly name: string;
  readonly price: number;
};

export type CreateAdminProductExtraOutcome =
  | { readonly status: 'product-not-found' }
  | { readonly extra: AdminProductExtraMutationModel; readonly status: 'created' };

export type CreateAdminGroupOptionOutcome =
  | { readonly status: 'option-group-not-found' }
  | { readonly extra: AdminProductExtraMutationModel; readonly status: 'created' };

export type UpdateAdminProductExtraData = {
  readonly imageUrl?: string;
  readonly isActive?: boolean;
  readonly isSoldOut?: boolean;
  readonly name?: string;
  readonly price?: number;
};

export type UpdateAdminProductExtraOutcome =
  | { readonly status: 'extra-not-found' }
  | { readonly extra: AdminProductExtraMutationModel; readonly status: 'updated' };

export type ReorderAdminProductExtraItem = {
  readonly id: string;
  readonly sortOrder: number;
};

export interface AdminProductExtraWriteRepository {
  create(
    productId: string,
    data: CreateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<CreateAdminProductExtraOutcome>;

  createForOptionGroup(
    groupId: string,
    data: CreateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<CreateAdminGroupOptionOutcome>;

  softDelete(id: string, context: TransactionContext): Promise<boolean>;

  reorder(
    items: readonly ReorderAdminProductExtraItem[],
    context: TransactionContext,
  ): Promise<void>;

  update(
    id: string,
    data: UpdateAdminProductExtraData,
    context: TransactionContext,
  ): Promise<UpdateAdminProductExtraOutcome>;
}
