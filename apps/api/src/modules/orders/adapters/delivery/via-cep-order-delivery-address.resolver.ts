import { normalizeNeighborhood } from '@cardapio/shared';
import type {
  OrderDeliveryAddressResolution,
  OrderDeliveryAddressResolver,
} from '../../application/ports/order-delivery-address-resolver.port';

type ViaCepResponse = {
  readonly bairro?: string;
  readonly erro?: boolean | string;
  readonly localidade?: string;
};

export class ViaCepOrderDeliveryAddressResolver implements OrderDeliveryAddressResolver {
  public async resolveByCep(cep: string): Promise<OrderDeliveryAddressResolution | null> {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      return null;
    }

    let response: Response;
    let data: ViaCepResponse;
    try {
      response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      data = await response.json() as ViaCepResponse;
    } catch {
      return null;
    }

    if (!response.ok || data.erro || !data.localidade || !data.bairro) {
      return null;
    }

    return {
      normalizedKey: normalizeNeighborhood(`${data.localidade} ${data.bairro}`),
    };
  }
}
