import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const DELIVERY_AREA_WRITE_REPOSITORY = Symbol('DELIVERY_AREA_WRITE_REPOSITORY');

export type CreateDeliveryAreaData = {
  readonly city: string;
  readonly fee: number;
  readonly neighborhood: string;
  readonly normalizedKey: string;
};

export type DeliveryAreaMutationModel = {
  readonly city: string;
  readonly fee: number;
  readonly id: string;
  readonly isActive: boolean;
  readonly matchNormalizedKeys: readonly string[];
  readonly neighborhood: string;
  readonly normalizedKey: string;
};

export type CreateDeliveryAreaResult =
  | {
      readonly area: DeliveryAreaMutationModel;
      readonly status: 'created';
    }
  | {
      readonly status: 'duplicate-normalized-key';
    };

export type UpdateDeliveryAreaData = {
  readonly city?: string;
  readonly fee?: number;
  readonly isActive?: boolean;
  readonly neighborhood?: string;
};

export type UpdateDeliveryAreaResult =
  | {
      readonly area: DeliveryAreaMutationModel;
      readonly status: 'updated';
    }
  | {
      readonly status: 'not-found';
    }
  | {
      readonly status: 'duplicate-normalized-key';
    };

export type DeleteDeliveryAreaResult =
  | {
      readonly status: 'deleted';
    }
  | {
      readonly status: 'not-found';
    };

export interface DeliveryAreaWriteRepository {
  create(
    data: CreateDeliveryAreaData,
    context: TransactionContext,
  ): Promise<CreateDeliveryAreaResult>;

  delete(id: string, context: TransactionContext): Promise<DeleteDeliveryAreaResult>;

  update(
    id: string,
    data: UpdateDeliveryAreaData,
    context: TransactionContext,
  ): Promise<UpdateDeliveryAreaResult>;
}
