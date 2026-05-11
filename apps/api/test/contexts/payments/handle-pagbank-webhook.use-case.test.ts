import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HandlePagBankWebhookUseCase,
  PaymentWebhookForbiddenError,
} from '../../../src/modules/payments/application/use-cases/handle-pagbank-webhook.use-case';
import type {
  BuildPaymentWebhookJobInput,
  PaymentWebhookJob,
  PaymentWebhookJobFactory,
} from '../../../src/modules/payments/application/ports/payment-webhook-job-factory.port';
import type { PaymentWebhookQueue } from '../../../src/modules/payments/application/ports/payment-webhook-queue.port';
import type { PaymentWebhookSettings } from '../../../src/modules/payments/application/ports/payment-webhook-settings.port';
import type {
  PaymentWebhookSignatureVerifier,
  VerifyPaymentWebhookSignatureInput,
} from '../../../src/modules/payments/application/ports/payment-webhook-signature-verifier.port';

test('rejects a webhook with an invalid configured signature', async (): Promise<void> => {
  const harness = createHarness({
    signatureIsValid: false,
    webhookToken: 'webhook-token',
  });

  await assert.rejects(
    () =>
      harness.useCase.execute({
        payload: { id: 'ORDE_1' },
        rawBody: Buffer.from('{"id":"ORDE_1"}', 'utf8'),
        authenticityToken: 'invalid-token',
        productId: 'ORDE_1',
      }),
    PaymentWebhookForbiddenError,
  );

  assert.equal(harness.jobFactory.calls.length, 0);
  assert.deepEqual(harness.queue.jobs, []);
});

test('rejects production webhooks when the token is not configured', async (): Promise<void> => {
  const harness = createHarness({
    isProduction: true,
    webhookToken: '',
  });

  await assert.rejects(
    () =>
      harness.useCase.execute({
        payload: { id: 'ORDE_1' },
        productId: 'ORDE_1',
      }),
    (error: unknown): boolean =>
      error instanceof PaymentWebhookForbiddenError &&
      error.message === 'PagBank webhook token not configured',
  );

  assert.equal(harness.signatureVerifier.calls.length, 0);
  assert.equal(harness.jobFactory.calls.length, 0);
  assert.deepEqual(harness.queue.jobs, []);
});

test('verifies, maps, and enqueues a valid webhook job', async (): Promise<void> => {
  const paymentJob = createPaymentWebhookJob();
  const rawBody = Buffer.from('{"id":"ORDE_1"}', 'utf8');
  const harness = createHarness({
    job: paymentJob,
    signatureIsValid: true,
    webhookToken: 'webhook-token',
  });

  const result = await harness.useCase.execute({
    payload: { id: 'ORDE_1' },
    rawBody,
    authenticityToken: 'valid-token',
    productId: 'ORDE_1',
  });

  assert.deepEqual(result, { received: true });
  assert.deepEqual(harness.signatureVerifier.calls, [
    {
      token: 'webhook-token',
      rawBody,
      authenticityToken: 'valid-token',
    },
  ]);
  assert.deepEqual(harness.jobFactory.calls, [
    {
      payload: { id: 'ORDE_1' },
      productId: 'ORDE_1',
    },
  ]);
  assert.deepEqual(harness.queue.jobs, [paymentJob]);
});

test('accepts ignored webhook payloads without enqueueing', async (): Promise<void> => {
  const harness = createHarness({
    job: null,
    webhookToken: '',
  });

  const result = await harness.useCase.execute({
    payload: { status: 'PAID' },
  });

  assert.deepEqual(result, { received: true });
  assert.equal(harness.signatureVerifier.calls.length, 0);
  assert.deepEqual(harness.jobFactory.calls, [{ payload: { status: 'PAID' }, productId: undefined }]);
  assert.deepEqual(harness.queue.jobs, []);
});

function createHarness(input: {
  isProduction?: boolean;
  job?: PaymentWebhookJob | null;
  signatureIsValid?: boolean;
  webhookToken: string;
}): {
  jobFactory: FakePaymentWebhookJobFactory;
  queue: FakePaymentWebhookQueue;
  signatureVerifier: FakePaymentWebhookSignatureVerifier;
  useCase: HandlePagBankWebhookUseCase;
} {
  const settings = new FakePaymentWebhookSettings(input.webhookToken, input.isProduction ?? false);
  const signatureVerifier = new FakePaymentWebhookSignatureVerifier(input.signatureIsValid ?? true);
  const jobFactory = new FakePaymentWebhookJobFactory(input.job === undefined ? createPaymentWebhookJob() : input.job);
  const queue = new FakePaymentWebhookQueue();

  return {
    jobFactory,
    queue,
    signatureVerifier,
    useCase: new HandlePagBankWebhookUseCase(settings, signatureVerifier, jobFactory, queue),
  };
}

function createPaymentWebhookJob(): PaymentWebhookJob {
  return {
    paymentId: 'ORDE_1',
    referenceId: '11111111-1111-4111-8111-111111111111',
    status: 'approved',
    receivedAt: '2026-05-06T12:00:00.000Z',
  };
}

class FakePaymentWebhookSettings implements PaymentWebhookSettings {
  public constructor(
    private readonly webhookToken: string,
    private readonly production: boolean,
  ) {}

  public getWebhookToken(): string {
    return this.webhookToken;
  }

  public isProduction(): boolean {
    return this.production;
  }
}

class FakePaymentWebhookSignatureVerifier implements PaymentWebhookSignatureVerifier {
  public readonly calls: VerifyPaymentWebhookSignatureInput[] = [];

  public constructor(private readonly valid: boolean) {}

  public verify(input: VerifyPaymentWebhookSignatureInput): boolean {
    this.calls.push(input);
    return this.valid;
  }
}

class FakePaymentWebhookJobFactory implements PaymentWebhookJobFactory {
  public readonly calls: BuildPaymentWebhookJobInput[] = [];

  public constructor(private readonly job: PaymentWebhookJob | null) {}

  public build(input: BuildPaymentWebhookJobInput): PaymentWebhookJob | null {
    this.calls.push(input);
    return this.job;
  }
}

class FakePaymentWebhookQueue implements PaymentWebhookQueue {
  public readonly jobs: PaymentWebhookJob[] = [];

  public async enqueue(job: PaymentWebhookJob): Promise<void> {
    this.jobs.push(job);
  }
}
