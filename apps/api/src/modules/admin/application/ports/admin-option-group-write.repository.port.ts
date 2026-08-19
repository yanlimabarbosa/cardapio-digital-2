import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ADMIN_OPTION_GROUP_WRITE_REPOSITORY = Symbol('ADMIN_OPTION_GROUP_WRITE_REPOSITORY');

export type AdminOptionGroupMutationOptionModel = {
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly isSoldOut: boolean;
  readonly name: string;
  readonly price: number;
  readonly sortOrder: number;
};

export type AdminOptionGroupMutationModel = {
  readonly combinedLimitId: string | null;
  readonly id: string;
  readonly isActive: boolean;
  readonly maxSelections: number;
  readonly minSelections: number;
  readonly name: string;
  readonly options: readonly AdminOptionGroupMutationOptionModel[];
  readonly sortOrder: number;
};

export type CreateAdminOptionGroupData = {
  readonly maxSelections: number;
  readonly minSelections: number;
  readonly name: string;
  readonly sortOrder?: number;
};

export type CreateAdminOptionGroupOutcome =
  | { readonly status: 'product-not-found' }
  | { readonly optionGroup: AdminOptionGroupMutationModel; readonly status: 'created' };

export type ReorderAdminOptionGroupItem = {
  readonly id: string;
  readonly sortOrder: number;
};

export type UpdateAdminOptionGroupData = {
  readonly combinedLimitId?: string | null;
  readonly isActive?: boolean;
  readonly maxSelections?: number;
  readonly minSelections?: number;
  readonly name?: string;
  readonly sortOrder?: number;
};

export type UpdateAdminOptionGroupOutcome =
  | { readonly status: 'option-group-not-found' }
  | { readonly message: string; readonly status: 'invalid-selection-range' }
  | { readonly optionGroup: AdminOptionGroupMutationModel; readonly status: 'updated' };

export interface AdminOptionGroupWriteRepository {
  create(
    productId: string,
    data: CreateAdminOptionGroupData,
    context: TransactionContext,
  ): Promise<CreateAdminOptionGroupOutcome>;

  reorder(items: readonly ReorderAdminOptionGroupItem[], context: TransactionContext): Promise<void>;

  softDelete(id: string, context: TransactionContext): Promise<boolean>;

  update(
    id: string,
    data: UpdateAdminOptionGroupData,
    context: TransactionContext,
  ): Promise<UpdateAdminOptionGroupOutcome>;
}
