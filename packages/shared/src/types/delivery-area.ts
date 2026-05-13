export interface DeliveryAreaResponse {
  id: string;
  neighborhood: string;
  city: string;
  fee: number;
  normalizedKey: string;
  matchNormalizedKeys: string[];
  isActive: boolean;
}
