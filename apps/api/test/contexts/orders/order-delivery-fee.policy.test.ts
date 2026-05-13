import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InvalidOrderDeliveryFeeError,
  OrderDeliveryFeePolicy,
} from '../../../src/modules/orders/domain/order-delivery-fee.policy';

test('does not require or apply a delivery area for pickup orders', (): void => {
  const policy = OrderDeliveryFeePolicy.for({ deliveryType: 'pickup' });

  assert.equal(policy.requestedDeliveryAreaId(), null);
  assert.deepEqual(policy.resolve(null), {
    feeAmount: null,
    feeCents: 0,
  });
});

test('requires a delivery area for delivery orders with the existing message', (): void => {
  assertInvalidDeliveryFee(
    () => OrderDeliveryFeePolicy.for({ deliveryType: 'delivery' }).requestedDeliveryAreaId(),
    'Área de entrega é obrigatória para delivery',
  );
});

test('returns the requested delivery area id for delivery orders', (): void => {
  const policy = OrderDeliveryFeePolicy.for({
    deliveryType: 'delivery',
    deliveryAreaId: 'area-1',
  });

  assert.equal(policy.requestedDeliveryAreaId(), 'area-1');
});

test('rejects missing active delivery areas with the existing message', (): void => {
  assertInvalidDeliveryFee(
    () =>
      OrderDeliveryFeePolicy.for({
        deliveryType: 'delivery',
        deliveryAreaId: 'area-1',
        deliveryMatchKey: 'recife boa viagem',
      }).resolve(null),
    'Área de entrega não encontrada ou indisponível',
  );
});

test('applies the active delivery area fee', (): void => {
  const result = OrderDeliveryFeePolicy.for({
    deliveryType: 'delivery',
    deliveryAreaId: 'area-1',
    deliveryMatchKey: 'recife boa viagem',
  }).resolve({
    id: 'area-1',
    feeAmount: '7.50',
    feeCents: 750,
    matchNormalizedKeys: ['recife boa viagem'],
  });

  assert.deepEqual(result, {
    feeAmount: '7.50',
    feeCents: 750,
  });
});

test('rejects invalid persisted delivery fees', (): void => {
  assertInvalidDeliveryFee(
    () =>
      OrderDeliveryFeePolicy.for({
        deliveryType: 'delivery',
        deliveryAreaId: 'area-1',
        deliveryMatchKey: 'recife boa viagem',
      }).resolve({
        id: 'area-1',
        feeAmount: '',
        feeCents: Number.NaN,
        matchNormalizedKeys: ['recife boa viagem'],
      }),
    'Taxa de entrega inválida',
  );
});

test('rejects delivery areas that do not match the CEP bairro', (): void => {
  assertInvalidDeliveryFee(
    () =>
      OrderDeliveryFeePolicy.for({
        deliveryType: 'delivery',
        deliveryAreaId: 'area-1',
        deliveryMatchKey: 'recife pina',
      }).resolve({
        id: 'area-1',
        feeAmount: '7.50',
        feeCents: 750,
        matchNormalizedKeys: ['recife boa viagem'],
      }),
    'Área de entrega não compatível com o CEP informado',
  );
});

function assertInvalidDeliveryFee(resolve: () => unknown, message: string): void {
  assert.throws(
    resolve,
    (error: unknown): boolean =>
      error instanceof InvalidOrderDeliveryFeeError && error.message === message,
  );
}
