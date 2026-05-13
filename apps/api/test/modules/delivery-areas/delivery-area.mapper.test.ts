import assert from 'node:assert/strict';
import test from 'node:test';
import { toDeliveryAreaResponseDto } from '../../../src/modules/delivery-areas/delivery-area.mapper';
import { DeliveryAreaResponseDto } from '../../../src/modules/delivery-areas/dto/response/delivery-area-response.dto';

test('maps delivery area read models to response DTOs', (): void => {
  const result = toDeliveryAreaResponseDto({
    id: 'area-1',
    neighborhood: 'Centro',
    city: 'Recife',
    fee: 7.5,
    normalizedKey: 'recife-centro',
    matchNormalizedKeys: ['recife-centro'],
    isActive: true,
  });

  assert.ok(result instanceof DeliveryAreaResponseDto);
  assert.equal(result.id, 'area-1');
  assert.equal(result.neighborhood, 'Centro');
  assert.equal(result.city, 'Recife');
  assert.equal(result.fee, 7.5);
  assert.equal(result.normalizedKey, 'recife-centro');
  assert.deepEqual(result.matchNormalizedKeys, ['recife-centro']);
  assert.equal(result.isActive, true);
});
