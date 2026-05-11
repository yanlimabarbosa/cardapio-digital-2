import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';

export const ORDER_DELIVERY_AREA_REPOSITORY = Symbol('ORDER_DELIVERY_AREA_REPOSITORY');

export type OrderDeliveryAreaModel = {
  readonly feeAmount: string;
  readonly feeCents: number;
  readonly id: string;
};

export interface OrderDeliveryAreaRepository {
  findActiveById(id: string, context?: TransactionContext): Promise<OrderDeliveryAreaModel | null>;
}
