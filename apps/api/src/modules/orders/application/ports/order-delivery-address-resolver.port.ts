export const ORDER_DELIVERY_ADDRESS_RESOLVER = Symbol('ORDER_DELIVERY_ADDRESS_RESOLVER');

export type OrderDeliveryAddressResolution = {
  readonly normalizedKey: string;
};

export interface OrderDeliveryAddressResolver {
  resolveByCep(cep: string): Promise<OrderDeliveryAddressResolution | null>;
}
