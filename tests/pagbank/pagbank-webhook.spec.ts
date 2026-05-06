import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  buildPagBankWebhookJob,
  enqueuePagBankWebhookJob,
  mapPagBankStatus,
  normalizePagBankReferenceId,
  verifyPagBankWebhookSignature,
} from '../../apps/api/src/modules/payments/pagbank-webhook';

const webhookToken = 'pagbank-webhook-test-token';

test.describe('PagBank webhook authenticity and payload mapping', () => {
  test('validates x-authenticity-token using the documented SHA-256 token-payload format', () => {
    const payload = {
      id: 'CHAR_354828dd-786b-4cca-8ce4-6f7a1f3f2a1a',
      status: 'PAID',
      reference_id: '11111111-1111-4111-8111-111111111111',
    };
    const rawBody = rawJson(payload);

    expect(verifyPagBankWebhookSignature(webhookToken, signPayload(rawBody), rawBody)).toBe(true);
    expect(verifyPagBankWebhookSignature(webhookToken, 'invalid-signature', rawBody)).toBe(false);
    expect(verifyPagBankWebhookSignature(webhookToken, signPayload(rawBody), rawJson({ ...payload, status: 'DECLINED' }))).toBe(false);
  });

  test('maps a signed Orders API webhook payload to a queue job for status synchronization', () => {
    const payload = {
      id: 'ORDE_F87334AC-BB8B-42E2-AA85-8579F70AA328',
      reference_id: '11111111-1111-4111-8111-111111111111',
      charges: [
        {
          id: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
          status: 'PAID',
        },
      ],
    };

    expect(buildPagBankWebhookJob(payload, 'ORDE_F87334AC-BB8B-42E2-AA85-8579F70AA328', '2026-05-06T12:00:00.000Z')).toEqual({
      paymentId: 'ORDE_F87334AC-BB8B-42E2-AA85-8579F70AA328',
      referenceId: '11111111-1111-4111-8111-111111111111',
      status: undefined,
      receivedAt: '2026-05-06T12:00:00.000Z',
    });
  });

  test('maps charge webhook statuses to local payment statuses', () => {
    expect(buildPagBankWebhookJob({
      id: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
      reference_id: '22222222-2222-4222-8222-222222222222',
      status: 'PAID',
    }, undefined, '2026-05-06T12:00:00.000Z')).toEqual({
      paymentId: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
      referenceId: '22222222-2222-4222-8222-222222222222',
      status: 'approved',
      receivedAt: '2026-05-06T12:00:00.000Z',
    });

    expect(mapPagBankStatus('DECLINED')).toBe('rejected');
    expect(mapPagBankStatus('CANCELED')).toBe('rejected');
    expect(mapPagBankStatus('REFUNDED')).toBe('refunded');
    expect(mapPagBankStatus('WAITING')).toBe('pending');
  });

  test('enqueues a mocked webhook job with the same BullMQ contract used by the controller', async () => {
    const queue = createQueueMock();
    const paymentJob = {
      paymentId: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
      referenceId: '22222222-2222-4222-8222-222222222222',
      status: 'approved' as const,
      receivedAt: '2026-05-06T12:00:00.000Z',
    };

    await enqueuePagBankWebhookJob(queue as any, paymentJob);

    expect(queue.calls).toEqual([
      [
        'process-payment',
        paymentJob,
        {
          jobId: 'pagbank-payment-CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      ],
    ]);
  });

  test('does not process charge webhooks that cannot be mapped to a local order', () => {
    expect(buildPagBankWebhookJob({
      id: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
      status: 'PAID',
    }, undefined)).toBeNull();
  });

  test('normalizes legacy card-prefixed reference ids', () => {
    expect(normalizePagBankReferenceId('card-33333333-3333-4333-8333-333333333333')).toBe('33333333-3333-4333-8333-333333333333');
    expect(normalizePagBankReferenceId('33333333-3333-4333-8333-333333333333')).toBe('33333333-3333-4333-8333-333333333333');
  });
});

function rawJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8');
}

function signPayload(rawBody: Buffer) {
  return createHash('sha256')
    .update(`${webhookToken}-${rawBody.toString('utf8')}`)
    .digest('hex');
}

function createQueueMock() {
  const calls: unknown[][] = [];
  return {
    calls,
    add: async (...args: unknown[]) => {
      calls.push(args);
    },
  };
}
