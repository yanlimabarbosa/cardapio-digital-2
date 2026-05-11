import type { AdminProductReadModel } from '../read-models/admin-product.read-model';
import type { AdminFeaturedProductReadModel } from '../read-models/admin-featured-product.read-model';
import type { AdminOptionGroupReadModel } from '../read-models/admin-option-group.read-model';
import type { AdminProductExtraListReadModel } from '../read-models/admin-product-extra.read-model';

export const ADMIN_PRODUCT_READ_REPOSITORY = Symbol('ADMIN_PRODUCT_READ_REPOSITORY');

export interface AdminProductReadRepository {
  list(): Promise<readonly AdminProductReadModel[]>;
  listExtras(productId: string): Promise<readonly AdminProductExtraListReadModel[] | null>;
  listFeatured(): Promise<readonly AdminFeaturedProductReadModel[]>;
  listOptionGroups(productId: string): Promise<readonly AdminOptionGroupReadModel[] | null>;
}
