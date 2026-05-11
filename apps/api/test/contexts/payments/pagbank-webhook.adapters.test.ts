import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { ConfigPaymentWebhookSettings } from '../../../src/modules/payments/adapters/config/config-payment-webhook.settings';
import { PagBankWebhookJobFactory } from '../../../src/modules/payments/adapters/pagbank/pagbank-webhook-job.factory';
import { PagBankWebhookSignatureVerifier } from '../../../src/modules/payments/adapters/pagbank/pagbank-webhook-signature.verifier';
import {
  BullMqPaymentWebhookQueue,
  type BullMqPaymentWebhookAddQueue,
  type BullMqPaymentWebhookJobOptions,
} from '../../../src/modules/payments/adapters/queue/bullmq-payment-webhook.queue';
import type { PaymentWebhookJob } from '../../../src/modules/payments/application/ports/payment-webhook-job-factory.port';

test('verifies PagBank webhook signatures from the raw request body', (): void => {
  const verifier = new PagBankWebhookSignatureVerifier();
  const token = 'webhook-token';
  const rawBody = Buffer.from('{"id":"ORDE_1"}', 'utf8');
  const authenticityToken = signWebhook(token, rawBody);

  assert.equal(verifier.verify({ token, rawBody, authenticityToken }), true);
  assert.equal(verifier.verify({ token, rawBody, authenticityToken: 'invalid-token' }), false);
  assert.equal(verifier.verify({ token, authenticityToken }), false);
});

test('builds PagBank webhook jobs from order payloads', (): void => {
  const factory = new PagBankWebhookJobFactory();

  const job = factory.build({
    payload: {
      id: 'ORDE_1',
      reference_id: 'order-1',
      status: 'PAID',
    },
  });

  assert.deepEqual(omitReceivedAt(job), {
    paymentId: 'ORDE_1',
    referenceId: 'order-1',
    status: 'approved',
  });
  assert.equal(typeof job?.receivedAt, 'string');
  assert.equal(Number.isNaN(Date.parse(job?.receivedAt ?? '')), false);
});

test('normalizes card references and ignores charge webhooks without order references', (): void => {
  const factory = new PagBankWebhookJobFactory();

  const chargeJob = factory.build({
    payload: {
      id: 'CHAR_1',
      reference_id: 'card-order-1',
      status: 'DECLINED',
    },
  });
  const ignoredChargeJob = factory.build({
    payload: {
      id: 'CHAR_2',
      status: 'PAID',
    },
  });

  assert.deepEqual(omitReceivedAt(chargeJob), {
    paymentId: 'CHAR_1',
    referenceId: 'order-1',
    status: 'rejected',
  });
  assert.equal(ignoredChargeJob, null);
});

test('uses the product id fallback and ignores payloads without payment identity', (): void => {
  const factory = new PagBankWebhookJobFactory();

  const fallbackJob = factory.build({
    payload: {
      status: 'IN_ANALYSIS',
    },
    productId: 'ORDE_2',
  });
  const ignoredJob = factory.build({
    payload: {
      status: 'PAID',
    },
  });

  assert.deepEqual(omitReceivedAt(fallbackJob), {
    paymentId: 'ORDE_2',
    referenceId: undefined,
    status: 'pending',
  });
  assert.equal(ignoredJob, null);
});

test('enqueues PagBank webhook jobs with the existing BullMQ options', async (): Promise<void> => {
  const bullQueue = new FakeBullMqQueue();
  const queue = new BullMqPaymentWebhookQueue(bullQueue);
  const job = createWebhookJob();

  await queue.enqueue(job);

  assert.deepEqual(bullQueue.calls, [
    {
      name: 'process-payment',
      data: job,
      options: {
        jobId: 'pagbank-payment-ORDE_1',
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    },
  ]);
});

test('reads payment webhook settings from Nest config', (): void => {
  const settings = new ConfigPaymentWebhookSettings(
    new FakeConfigService({
      NODE_ENV: 'production',
      PAGBANK_WEBHOOK_TOKEN: 'webhook-token',
    }),
  );

  assert.equal(settings.getWebhookToken(), 'webhook-token');
  assert.equal(settings.isProduction(), true);
});

function signWebhook(token: string, rawBody: Buffer): string {
  return createHash('sha256')
    .update(`${token}-${rawBody.toString('utf8')}`)
    .digest('hex');
}

function omitReceivedAt(job: PaymentWebhookJob | null): Omit<PaymentWebhookJob, 'receivedAt'> | null {
  if (!job) return null;

  return {
    paymentId: job.paymentId,
    referenceId: job.referenceId,
    status: job.status,
  };
}

function createWebhookJob(): PaymentWebhookJob {
  return {
    paymentId: 'ORDE_1',
    referenceId: 'order-1',
    status: 'approved',
    receivedAt: '2026-05-07T12:00:00.000Z',
  };
}

type FakeBullMqQueueCall = {
  readonly data: PaymentWebhookJob;
  readonly name: string;
  readonly options: BullMqPaymentWebhookJobOptions;
};

class FakeBullMqQueue implements BullMqPaymentWebhookAddQueue {
  public readonly calls: FakeBullMqQueueCall[] = [];

  public async add(
    name: string,
    data: PaymentWebhookJob,
    options: BullMqPaymentWebhookJobOptions,
  ): Promise<unknown> {
    this.calls.push({ name, data, options });
    return { id: options.jobId };
  }
}

class FakeConfigService {
  public constructor(private readonly values: Readonly<Record<string, string | undefined>>) {}

  public get<T>(key: string, defaultValue: T): T {
    const value = this.values[key];
    return value === undefined ? defaultValue : (value as T);
  }
}
