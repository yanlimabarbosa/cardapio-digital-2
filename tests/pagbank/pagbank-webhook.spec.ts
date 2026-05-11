import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import {
  PagBankWebhookJobFactory,
} from '../../apps/api/src/modules/payments/adapters/pagbank/pagbank-webhook-job.factory';
import {
  PagBankWebhookSignatureVerifier,
} from '../../apps/api/src/modules/payments/adapters/pagbank/pagbank-webhook-signature.verifier';
import {
  BullMqPaymentWebhookQueue,
  type BullMqPaymentWebhookAddQueue,
  type BullMqPaymentWebhookJobOptions,
} from '../../apps/api/src/modules/payments/adapters/queue/bullmq-payment-webhook.queue';
import type {
  PaymentWebhookJob,
} from '../../apps/api/src/modules/payments/application/ports/payment-webhook-job-factory.port';

const webhookToken = 'pagbank-webhook-test-token';
const receivedAt = '2026-05-06T12:00:00.000Z';

test.describe('PagBank webhook authenticity and payload mapping', () => {
  test('validates x-authenticity-token using the documented SHA-256 token-payload format', () => {
    const verifier = new PagBankWebhookSignatureVerifier();
    const payload = {
      id: 'CHAR_354828dd-786b-4cca-8ce4-6f7a1f3f2a1a',
      status: 'PAID',
      reference_id: '11111111-1111-4111-8111-111111111111',
    };
    const rawBody = rawJson(payload);

    expect(verifier.verify({
      token: webhookToken,
      authenticityToken: signPayload(rawBody),
      rawBody,
    })).toBe(true);
    expect(verifier.verify({
      token: webhookToken,
      authenticityToken: 'invalid-signature',
      rawBody,
    })).toBe(false);
    expect(verifier.verify({
      token: webhookToken,
      authenticityToken: signPayload(rawBody),
      rawBody: rawJson({ ...payload, status: 'DECLINED' }),
    })).toBe(false);
  });

  test('maps a signed Orders API webhook payload to a queue job for status synchronization', () => {
    const factory = createJobFactory();
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

    expect(factory.build({
      payload,
      productId: 'ORDE_F87334AC-BB8B-42E2-AA85-8579F70AA328',
    })).toEqual({
      paymentId: 'ORDE_F87334AC-BB8B-42E2-AA85-8579F70AA328',
      referenceId: '11111111-1111-4111-8111-111111111111',
      status: undefined,
      receivedAt,
    });
  });

  test('maps charge webhook statuses to local payment statuses', () => {
    const factory = createJobFactory();

    expect(factory.build({
      payload: {
        id: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
        reference_id: '22222222-2222-4222-8222-222222222222',
        status: 'PAID',
      },
    })).toEqual({
      paymentId: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
      referenceId: '22222222-2222-4222-8222-222222222222',
      status: 'approved',
      receivedAt,
    });

    expect(getMappedStatus('DECLINED')).toBe('rejected');
    expect(getMappedStatus('CANCELED')).toBe('rejected');
    expect(getMappedStatus('REFUNDED')).toBe('refunded');
    expect(getMappedStatus('WAITING')).toBe('pending');
  });

  test('enqueues a mocked webhook job with the same BullMQ contract used by the controller', async () => {
    const queue = createQueueMock();
    const adapter = new BullMqPaymentWebhookQueue(queue);
    const paymentJob = {
      paymentId: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
      referenceId: '22222222-2222-4222-8222-222222222222',
      status: 'approved' as const,
      receivedAt,
    };

    await adapter.enqueue(paymentJob);

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
    const factory = createJobFactory();

    expect(factory.build({
      payload: {
        id: 'CHAR_F1F10115-09F4-4560-85F5-A828D9F96300',
        status: 'PAID',
      },
    })).toBeNull();
  });

  test('normalizes legacy card-prefixed reference ids', () => {
    const factory = createJobFactory();

    expect(factory.build({
      payload: {
        id: 'CHAR_1',
        reference_id: 'card-33333333-3333-4333-8333-333333333333',
      },
    })?.referenceId).toBe('33333333-3333-4333-8333-333333333333');
    expect(factory.build({
      payload: {
        id: 'CHAR_2',
        reference_id: '33333333-3333-4333-8333-333333333333',
      },
    })?.referenceId).toBe('33333333-3333-4333-8333-333333333333');
  });
});

function createJobFactory(): PagBankWebhookJobFactory {
  return new PagBankWebhookJobFactory((): Date => new Date(receivedAt));
}

function getMappedStatus(status: string): PaymentWebhookJob['status'] {
  return createJobFactory().build({
    payload: {
      id: 'CHAR_STATUS',
      reference_id: 'order-1',
      status,
    },
  })?.status;
}

function rawJson(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), 'utf8');
}

function signPayload(rawBody: Buffer): string {
  return createHash('sha256')
    .update(`${webhookToken}-${rawBody.toString('utf8')}`)
    .digest('hex');
}

function createQueueMock(): FakeBullMqQueue {
  return new FakeBullMqQueue();
}

type BullMqQueueCall = readonly [
  name: string,
  data: PaymentWebhookJob,
  options: BullMqPaymentWebhookJobOptions,
];

class FakeBullMqQueue implements BullMqPaymentWebhookAddQueue {
  public readonly calls: BullMqQueueCall[] = [];

  public async add(
    name: string,
    data: PaymentWebhookJob,
    options: BullMqPaymentWebhookJobOptions,
  ): Promise<unknown> {
    this.calls.push([name, data, options]);
    return undefined;
  }
}
