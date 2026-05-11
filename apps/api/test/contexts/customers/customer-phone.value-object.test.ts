import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerPhone } from '../../../src/modules/customers/domain/customer-phone.value-object';

test('normalizes customer phone values with the legacy digit-only rule', (): void => {
  const phone = CustomerPhone.from('(81) 9 9999-0000');

  assert.equal(phone.value, '81999990000');
  assert.equal(phone.toString(), '81999990000');
});

test('keeps legacy permissive normalization for malformed input', (): void => {
  assert.equal(CustomerPhone.from('abc').value, '');
});

test('compares normalized customer phone values', (): void => {
  assert.equal(CustomerPhone.from('(81) 99999-0000').equals(CustomerPhone.from('81999990000')), true);
  assert.equal(CustomerPhone.from('(81) 99999-0001').equals(CustomerPhone.from('81999990000')), false);
});
