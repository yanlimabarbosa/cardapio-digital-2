import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ADMIN_COMBINED_LIMIT_WRITE_REPOSITORY = Symbol('ADMIN_COMBINED_LIMIT_WRITE_REPOSITORY');

export type AdminCombinedLimitMutationModel = {
  readonly id: string;
  readonly maxSelections: number;
  readonly name: string;
};

export type CreateAdminCombinedLimitData = {
  readonly maxSelections: number;
  readonly name: string;
};

export type CreateAdminCombinedLimitOutcome =
  | { readonly status: 'product-not-found' }
  | { readonly combinedLimit: AdminCombinedLimitMutationModel; readonly status: 'created' };

export type UpdateAdminCombinedLimitData = {
  readonly maxSelections?: number;
  readonly name?: string;
};

export type UpdateAdminCombinedLimitOutcome =
  | { readonly status: 'combined-limit-not-found' }
  | { readonly combinedLimit: AdminCombinedLimitMutationModel; readonly status: 'updated' };

export interface AdminCombinedLimitWriteRepository {
  create(
    productId: string,
    data: CreateAdminCombinedLimitData,
    context: TransactionContext,
  ): Promise<CreateAdminCombinedLimitOutcome>;

  softDelete(id: string, context: TransactionContext): Promise<boolean>;

  update(
    id: string,
    data: UpdateAdminCombinedLimitData,
    context: TransactionContext,
  ): Promise<UpdateAdminCombinedLimitOutcome>;
}
