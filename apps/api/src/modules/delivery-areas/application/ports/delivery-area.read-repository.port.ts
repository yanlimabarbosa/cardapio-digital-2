import type { DeliveryAreaReadModel } from '../read-models/delivery-area.read-model';

export const DELIVERY_AREA_READ_REPOSITORY = Symbol('DELIVERY_AREA_READ_REPOSITORY');

export interface DeliveryAreaReadRepository {
  listActive(): Promise<readonly DeliveryAreaReadModel[]>;
  listAll(): Promise<readonly DeliveryAreaReadModel[]>;
}
