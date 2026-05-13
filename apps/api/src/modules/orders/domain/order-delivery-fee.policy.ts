export type OrderDeliveryFeeRequest = {
  readonly deliveryMatchKey?: string | null;
  readonly deliveryAreaId?: string | null;
  readonly deliveryType?: 'delivery' | 'pickup' | null;
};

export type OrderDeliveryFeeAreaInput = {
  readonly feeAmount: string;
  readonly feeCents: number;
  readonly id: string;
  readonly matchNormalizedKeys: readonly string[];
};

export type OrderDeliveryFeeResolution = {
  readonly feeAmount: string | null;
  readonly feeCents: number;
};

export class InvalidOrderDeliveryFeeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InvalidOrderDeliveryFeeError';
  }
}

export class OrderDeliveryFeePolicy {
  private constructor(private readonly request: OrderDeliveryFeeRequest) {}

  public static for(request: OrderDeliveryFeeRequest): OrderDeliveryFeePolicy {
    return new OrderDeliveryFeePolicy(request);
  }

  public requestedDeliveryAreaId(): string | null {
    if (!this.isDelivery()) {
      return null;
    }

    if (!this.request.deliveryAreaId) {
      throw new InvalidOrderDeliveryFeeError('Área de entrega é obrigatória para delivery');
    }

    return this.request.deliveryAreaId;
  }

  public resolve(area: OrderDeliveryFeeAreaInput | null): OrderDeliveryFeeResolution {
    if (!this.isDelivery()) {
      return {
        feeAmount: null,
        feeCents: 0,
      };
    }

    if (!area) {
      throw new InvalidOrderDeliveryFeeError('Área de entrega não encontrada ou indisponível');
    }

    this.assertValidFee(area);
    this.assertAreaMatchesDeliveryAddress(area);

    return {
      feeAmount: area.feeAmount,
      feeCents: area.feeCents,
    };
  }

  private isDelivery(): boolean {
    return this.request.deliveryType === 'delivery';
  }

  private assertValidFee(area: OrderDeliveryFeeAreaInput): void {
    if (!Number.isFinite(area.feeCents) || area.feeCents < 0 || area.feeAmount.trim().length === 0) {
      throw new InvalidOrderDeliveryFeeError('Taxa de entrega inválida');
    }
  }

  private assertAreaMatchesDeliveryAddress(area: OrderDeliveryFeeAreaInput): void {
    if (!this.request.deliveryMatchKey) {
      throw new InvalidOrderDeliveryFeeError('CEP de entrega é obrigatório para delivery');
    }

    if (!area.matchNormalizedKeys.includes(this.request.deliveryMatchKey)) {
      throw new InvalidOrderDeliveryFeeError('Área de entrega não compatível com o CEP informado');
    }
  }
}
