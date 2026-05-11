import type { WeeklySchedule } from '@cardapio/shared';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ADMIN_CATEGORY_WRITE_REPOSITORY = Symbol('ADMIN_CATEGORY_WRITE_REPOSITORY');

export type ReorderAdminCategoryItem = {
  readonly id: string;
  readonly sortOrder: number;
};

export type AdminCategoryMutationModel = {
  readonly availabilitySchedule?: WeeklySchedule | null;
  readonly createdAt?: Date;
  readonly description?: string;
  readonly id: string;
  readonly imageUrl?: string;
  readonly isActive: boolean;
  readonly name: string;
  readonly sortOrder: number;
  readonly updatedAt?: Date;
};

export type CreateAdminCategoryData = {
  readonly availabilitySchedule?: WeeklySchedule | null;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly name: string;
  readonly sortOrder?: number;
};

export type UpdateAdminCategoryData = {
  readonly availabilitySchedule?: WeeklySchedule | null;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly isActive?: boolean;
  readonly name?: string;
  readonly sortOrder?: number;
};

export interface AdminCategoryWriteRepository {
  create(data: CreateAdminCategoryData, context: TransactionContext): Promise<AdminCategoryMutationModel>;
  reorder(items: readonly ReorderAdminCategoryItem[], context: TransactionContext): Promise<void>;
  softDelete(id: string, context: TransactionContext): Promise<boolean>;
  update(
    id: string,
    data: UpdateAdminCategoryData,
    context: TransactionContext,
  ): Promise<AdminCategoryMutationModel | null>;
}
