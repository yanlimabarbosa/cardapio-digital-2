import assert from 'node:assert/strict';
import test from 'node:test';
import { DeliveryAreaKeyPolicy } from '../../../src/modules/delivery-areas/domain/delivery-area-key.policy';

test('builds the normalized delivery area key from city and neighborhood', (): void => {
  const policy = DeliveryAreaKeyPolicy.create({
    city: 'João Pessoa',
    neighborhood: 'Manaíra',
  });

  assert.equal(policy.normalizedKey(), 'joao pessoa manaira');
});

test('normalizes hyphens and repeated whitespace', (): void => {
  const policy = DeliveryAreaKeyPolicy.create({
    city: 'João   Pessoa',
    neighborhood: 'Altiplano-Cabo Branco',
  });

  assert.equal(policy.normalizedKey(), 'joao pessoa altiplano cabo branco');
});

test('matches stored keys using the same normalization rules', (): void => {
  const policy = DeliveryAreaKeyPolicy.create({
    city: 'João Pessoa',
    neighborhood: 'Bessa',
  });

  assert.equal(policy.matches('joao-pessoa    bessa'), true);
  assert.equal(policy.matches('joao pessoa tambau'), false);
});
