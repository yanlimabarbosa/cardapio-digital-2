import type { WeeklySchedule } from '@cardapio/shared';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ADMIN_SECTION_WRITE_REPOSITORY = Symbol('ADMIN_SECTION_WRITE_REPOSITORY');

export type AdminSectionMutationProductModel = {
  readonly id: string;
  readonly imageUrl?: string;
  readonly name: string;
  readonly price: number;
};

export type ReorderAdminSectionItem = {
  readonly id: string;
  readonly sortOrder: number;
};

export type AdminSectionMutationModel = {
  readonly availabilitySchedule?: WeeklySchedule | null;
  readonly emoji?: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly label: string;
  readonly sortOrder: number;
};

export type AdminSectionCreateMutationModel = AdminSectionMutationModel & {
  readonly productCount: number;
  readonly products: readonly AdminSectionMutationProductModel[];
};

export type CreateAdminSectionData = {
  readonly availabilitySchedule?: WeeklySchedule | null;
  readonly emoji?: string;
  readonly label: string;
};

export type UpdateAdminSectionData = {
  readonly availabilitySchedule?: WeeklySchedule | null;
  readonly emoji?: string;
  readonly isActive?: boolean;
  readonly label?: string;
};

export type SetAdminSectionProductsResult =
  | {
      readonly status: 'success';
    }
  | {
      readonly status: 'section-not-found';
    }
  | {
      readonly productId: string;
      readonly status: 'product-not-found';
    };

export interface AdminSectionWriteRepository {
  create(data: CreateAdminSectionData, context: TransactionContext): Promise<AdminSectionCreateMutationModel>;
  delete(id: string, context: TransactionContext): Promise<boolean>;
  reorder(items: readonly ReorderAdminSectionItem[], context: TransactionContext): Promise<void>;
  setProducts(
    sectionId: string,
    productIds: readonly string[],
    context: TransactionContext,
  ): Promise<SetAdminSectionProductsResult>;
  update(
    id: string,
    data: UpdateAdminSectionData,
    context: TransactionContext,
  ): Promise<AdminSectionMutationModel | null>;
}
