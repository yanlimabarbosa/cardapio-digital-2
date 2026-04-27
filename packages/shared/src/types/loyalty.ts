export interface LoyaltyTransactionResponse {
  id: string;
  points: number;
  type: 'earn' | 'redeem' | 'adjustment';
  description: string | null;
  createdAt: string;
}

export interface LoyaltyResponse {
  balance: number;
  transactions: LoyaltyTransactionResponse[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RedeemableProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  redemptionCost: number;
  canRedeem: boolean;
}

export interface RedeemableResponse {
  balance: number;
  products: RedeemableProduct[];
}
