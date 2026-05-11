export type GatewayPaymentStatus = 'approved' | 'pending' | 'rejected' | 'refunded';

export class PaymentStatusPolicy {
  private constructor() {}

  public static create(): PaymentStatusPolicy {
    return new PaymentStatusPolicy();
  }

  public fromGatewayChargeStatus(status: string | undefined): GatewayPaymentStatus | undefined {
    const normalizedStatus = status?.toUpperCase();

    if (normalizedStatus === 'PAID') {
      return 'approved';
    }

    if (
      normalizedStatus === 'DECLINED' ||
      normalizedStatus === 'CANCELED' ||
      normalizedStatus === 'CANCELLED'
    ) {
      return 'rejected';
    }

    if (normalizedStatus === 'REFUNDED') {
      return 'refunded';
    }

    if (normalizedStatus) {
      return 'pending';
    }

    return undefined;
  }

  public fromGatewayChargeStatuses(statuses: readonly (string | undefined)[]): GatewayPaymentStatus {
    const mappedStatuses = statuses
      .map((status: string | undefined): GatewayPaymentStatus | undefined => this.fromGatewayChargeStatus(status))
      .filter((status: GatewayPaymentStatus | undefined): status is GatewayPaymentStatus => status !== undefined);

    if (mappedStatuses.includes('approved')) {
      return 'approved';
    }

    if (mappedStatuses.includes('rejected')) {
      return 'rejected';
    }

    if (mappedStatuses.includes('refunded')) {
      return 'refunded';
    }

    return 'pending';
  }
}
