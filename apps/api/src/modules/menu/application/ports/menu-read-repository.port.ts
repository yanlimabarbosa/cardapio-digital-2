import type { MenuReadModel } from '../read-models/menu.read-model';
import type { ProductReadModel } from '../read-models/product.read-model';

export type MenuAvailabilityQuery = {
  readonly scheduledFor?: string;
};

export type ProductLookupQuery = MenuAvailabilityQuery & {
  readonly ids: readonly string[];
};

export interface MenuReadRepository {
  getMenu(query: MenuAvailabilityQuery): Promise<readonly MenuReadModel[]>;
  getFeaturedProducts(query: MenuAvailabilityQuery): Promise<readonly ProductReadModel[]>;
  getProductsByIds(query: ProductLookupQuery): Promise<readonly ProductReadModel[]>;
}
