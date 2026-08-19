import type { WeeklySchedule } from '@cardapio/shared';
import type { TransactionContext } from '../../../../shared/application/unit-of-work/unit-of-work.port';
import type {
  OrderItemSnapshotCombinedLimitInput,
  OrderItemSnapshotExtraInput,
  OrderItemSnapshotOptionGroupInput,
} from '../../domain/order-item-snapshot.policy';

export const ORDER_PRODUCT_CATALOG_REPOSITORY = Symbol('ORDER_PRODUCT_CATALOG_REPOSITORY');

export type OrderableProductCategoryModel = {
  readonly availabilitySchedule?: WeeklySchedule | null;
};

export type OrderableProductModel = {
  readonly category: OrderableProductCategoryModel;
  readonly combinedLimits: readonly OrderItemSnapshotCombinedLimitInput[];
  readonly extras: readonly OrderItemSnapshotExtraInput[];
  readonly id: string;
  readonly isActive?: boolean | null;
  readonly isCompound?: boolean | null;
  readonly isPromotional?: boolean | null;
  readonly isRedeemable?: boolean | null;
  readonly name: string;
  readonly optionGroups: readonly OrderItemSnapshotOptionGroupInput[];
  readonly price: string;
  readonly promotionalPrice?: string | null;
  readonly promotionEndDate?: Date | null;
  readonly promotionStartDate?: Date | null;
  readonly redemptionCost?: number | null;
};

export type FindOrderableProductsQuery = {
  readonly context?: TransactionContext;
  readonly ids: readonly string[];
  readonly includeComposition: boolean;
};

export interface OrderProductCatalogRepository {
  findOrderableProducts(query: FindOrderableProductsQuery): Promise<readonly OrderableProductModel[]>;
}
