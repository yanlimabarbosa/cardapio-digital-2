import type { OrderReadModel } from '../read-models/order.read-model';

export interface OrderReadRepository {
  getKitchenOrders(): Promise<readonly OrderReadModel[]>;
  getOrderDetails(id: string): Promise<OrderReadModel>;
}
