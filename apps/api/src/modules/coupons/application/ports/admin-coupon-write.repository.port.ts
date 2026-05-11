import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type { CouponCreationData } from '../../domain/coupon-creation-draft.value-object';
import type { CouponUpdatePatch } from '../../domain/coupon-update-patch.value-object';
import type { AdminCouponReadModel } from '../read-models/admin-coupon.read-model';

export const ADMIN_COUPON_WRITE_REPOSITORY = Symbol('ADMIN_COUPON_WRITE_REPOSITORY');

export type CreateAdminCouponResult =
  | {
      readonly coupon: AdminCouponReadModel;
      readonly status: 'created';
    }
  | {
      readonly status: 'duplicate-code';
    };

export type ToggleAdminCouponActiveResult =
  | {
      readonly coupon: AdminCouponReadModel;
      readonly status: 'updated';
    }
  | {
      readonly status: 'not-found';
    };

export type UpdateAdminCouponResult =
  | {
      readonly coupon: AdminCouponReadModel;
      readonly status: 'updated';
    }
  | {
      readonly status: 'duplicate-code';
    }
  | {
      readonly status: 'not-found';
    };

export interface AdminCouponWriteRepository {
  create(
    data: CouponCreationData,
    context: TransactionContext,
  ): Promise<CreateAdminCouponResult>;

  update(
    id: string,
    patch: CouponUpdatePatch,
    context: TransactionContext,
  ): Promise<UpdateAdminCouponResult>;

  toggleActive(
    id: string,
    context: TransactionContext,
  ): Promise<ToggleAdminCouponActiveResult>;
}
