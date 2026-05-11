export type LoyaltyAdjustmentDecision =
  | {
    allowed: true;
    balance: number;
  }
  | {
    allowed: false;
    reason: string;
  };

export type LoyaltyEarnInput = {
  totalCents: number;
  deliveryFeeCents: number;
  pointsPerReal: number;
};

export class LoyaltyPointsPolicy {
  private constructor(private readonly balance: number) {}

  public static forBalance(balance: number): LoyaltyPointsPolicy {
    if (!Number.isFinite(balance)) {
      throw new Error('Loyalty points balance must be finite');
    }

    return new LoyaltyPointsPolicy(balance);
  }

  public redemptionCost(cost: number | null | undefined): number {
    return cost ?? 0;
  }

  public canRedeem(cost: number | null | undefined): boolean {
    return this.balance >= this.redemptionCost(cost);
  }

  public adjust(points: number): LoyaltyAdjustmentDecision {
    const newBalance = this.balance + points;

    if (newBalance < 0) {
      return {
        allowed: false,
        reason: 'Saldo insuficiente de pontos',
      };
    }

    return {
      allowed: true,
      balance: newBalance,
    };
  }

  public defaultAdjustmentDescription(points: number): string {
    return points > 0 ? 'Ajuste manual (credito)' : 'Ajuste manual (debito)';
  }

  public pointsEarnedForOrder(input: LoyaltyEarnInput): number {
    if (!Number.isFinite(input.pointsPerReal) || input.pointsPerReal <= 0) {
      return 0;
    }

    const eligibleCents = input.totalCents - input.deliveryFeeCents;

    if (eligibleCents <= 0) {
      return 0;
    }

    return Math.floor((eligibleCents / 100) * input.pointsPerReal);
  }
}
