import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod } from '@cardapio/shared';
import { PagBankPaymentGateway } from '../../../src/modules/payments/adapters/pagbank/pagbank-payment.gateway';
import type { PaymentOrder } from '../../../src/modules/payments/application/ports/payment-order.port';

type RecordedRequest = {
  readonly authorization: string | null;
  readonly body?: unknown;
  readonly method: string | undefined;
  readonly url: string;
};

test('creates 3DS sessions through the PagBank SDK API and records sanitized evidence', async (): Promise<void> => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'pagbank-gateway-3ds-'));
  const evidenceFile = path.join(tmp, 'evidence.jsonl');
  const requests: RecordedRequest[] = [];
  const restoreFetch = replaceFetch(async (input, init): Promise<Response> => {
    requests.push({
      url: String(input),
      method: init?.method,
      authorization: new Headers(init?.headers).get('authorization'),
      body: parseRequestBody(init?.body),
    });

    return new Response(
      JSON.stringify({
        session: '3DS_session_1234567890',
        expires_at: 1778173200,
      }),
      { status: 201 },
    );
  });

  try {
    const gateway = new PagBankPaymentGateway(createConfigService({
      PAGBANK_ACCESS_TOKEN: 'secret-token',
      PAGBANK_ENV: 'sandbox',
      PAGBANK_EVIDENCE_ENABLED: 'true',
      PAGBANK_EVIDENCE_FILE: evidenceFile,
      PAGBANK_SDK_URL: 'https://sdk.test',
    }));

    const result = await gateway.create3dsSession();

    assert.deepEqual(result, {
      session: '3DS_session_1234567890',
      expiresAt: 1778173200,
    });
    assert.deepEqual(requests, [
      {
        url: 'https://sdk.test/checkout-sdk/sessions',
        method: 'POST',
        authorization: 'Bearer secret-token',
        body: undefined,
      },
    ]);

    const evidence = await readEvidenceLine(evidenceFile);
    assert.equal(evidence.service, 'sdk-api');
    assert.equal(evidence.path, '/checkout-sdk/sessions');
    assert.equal(evidence.method, 'POST');
    assert.equal(evidence.responseStatus, 201);

    const responseBody = requireRecord(evidence.responseBody);
    assert.equal(responseBody.session, '<pagbank-3ds-session:22>');
  } finally {
    restoreFetch();
    await rm(tmp, { recursive: true, force: true });
  }
});

test('creates Pix payments with the PagBank order payload and QR base64 lookup', async (): Promise<void> => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'pagbank-gateway-pix-'));
  const evidenceFile = path.join(tmp, 'evidence.jsonl');
  const requests: RecordedRequest[] = [];
  const restoreFetch = replaceFetch(async (input, init): Promise<Response> => {
    requests.push({
      url: String(input),
      method: init?.method,
      authorization: new Headers(init?.headers).get('authorization'),
      body: parseRequestBody(init?.body),
    });

    if (String(input) === 'https://pagbank.test/orders') {
      return new Response(
        JSON.stringify({
          id: 'ORDE_PIX_1',
          reference_id: 'order-1',
          qr_codes: [
            {
              text: '000201PIX',
              expiration_date: '2026-05-07T12:30:00.000Z',
              links: [
                {
                  rel: 'QRCODE.BASE64',
                  href: 'https://pagbank.test/qrcode/base64',
                  media: 'text/plain',
                },
              ],
            },
          ],
        }),
        { status: 201 },
      );
    }

    if (String(input) === 'https://pagbank.test/qrcode/base64') {
      return new Response('data:image/png;base64,YWJjZA==', { status: 200 });
    }

    return new Response(JSON.stringify({ message: 'unexpected url' }), { status: 500 });
  });

  try {
    const gateway = new PagBankPaymentGateway(createConfigService({
      API_PUBLIC_URL: 'https://api.example.com',
      PAGBANK_ACCESS_TOKEN: 'secret-token',
      PAGBANK_API_URL: 'https://pagbank.test',
      PAGBANK_ENV: 'sandbox',
      PAGBANK_EVIDENCE_ENABLED: 'true',
      PAGBANK_EVIDENCE_FILE: evidenceFile,
    }));

    const result = await gateway.createPixPayment({
      order: createPaymentOrder(),
      payerEmail: 'payer@example.com',
      payerTaxId: '12345678901',
    });

    assert.deepEqual(result, {
      paymentId: 'ORDE_PIX_1',
      qrCode: '000201PIX',
      qrCodeBase64: 'YWJjZA==',
      expiresAt: '2026-05-07T12:30:00.000Z',
    });

    const orderRequest = requireValue(requests[0]);
    assert.equal(orderRequest.url, 'https://pagbank.test/orders');
    assert.equal(orderRequest.method, 'POST');
    assert.equal(orderRequest.authorization, 'Bearer secret-token');

    const body = requireRecord(orderRequest.body);
    assert.equal(body.reference_id, 'order-1');
    assert.deepEqual(body.notification_urls, ['https://api.example.com/api/webhooks/pagbank']);

    const customer = requireRecord(body.customer);
    assert.equal(customer.email, 'payer@example.com');
    assert.equal(customer.tax_id, '12345678901');

    const items = requireArray(body.items);
    const item = requireRecord(requireValue(items[0]));
    assert.equal(item.reference_id, 'order-1');
    assert.equal(item.name, 'Pedido #42');
    assert.equal(item.quantity, 1);
    assert.equal(item.unit_amount, 2990);

    const qrCodes = requireArray(body.qr_codes);
    const qrCode = requireRecord(requireValue(qrCodes[0]));
    const amount = requireRecord(qrCode.amount);
    assert.equal(amount.value, 2990);

    const qrRequest = requireValue(requests[1]);
    assert.equal(qrRequest.url, 'https://pagbank.test/qrcode/base64');
    assert.equal(qrRequest.authorization, 'Bearer secret-token');

    const evidence = await readEvidenceLines(evidenceFile);
    assert.equal(evidence.length, 2);
    assert.equal(requireValue(evidence[0]).service, 'orders-api');
    assert.equal(requireValue(evidence[1]).service, 'qrcode-api');
  } finally {
    restoreFetch();
    await rm(tmp, { recursive: true, force: true });
  }
});

test('creates credit card payments with the PagBank charge payload and maps status detail', async (): Promise<void> => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'pagbank-gateway-card-'));
  const evidenceFile = path.join(tmp, 'evidence.jsonl');
  const requests: RecordedRequest[] = [];
  const restoreFetch = replaceFetch(async (input, init): Promise<Response> => {
    requests.push({
      url: String(input),
      method: init?.method,
      authorization: new Headers(init?.headers).get('authorization'),
      body: parseRequestBody(init?.body),
    });

    return new Response(
      JSON.stringify({
        id: 'ORDE_CARD_1',
        reference_id: 'order-1',
        charges: [
          {
            status: 'PAID',
            payment_response: {
              message: 'Pagamento aprovado',
            },
          },
        ],
      }),
      { status: 201 },
    );
  });

  try {
    const gateway = new PagBankPaymentGateway(createConfigService({
      API_PUBLIC_URL: 'http://localhost:3334',
      PAGBANK_ACCESS_TOKEN: 'secret-token',
      PAGBANK_API_URL: 'https://pagbank.test',
      PAGBANK_ENV: 'sandbox',
      PAGBANK_EVIDENCE_ENABLED: 'true',
      PAGBANK_EVIDENCE_FILE: evidenceFile,
    }));

    const result = await gateway.createCreditCardPayment({
      order: createPaymentOrder(PaymentMethod.CREDIT_CARD),
      cardholderName: 'JOSE DA SILVA',
      encryptedCard: 'encrypted-card-token',
      installments: 2,
      payerEmail: 'payer@example.com',
      payerTaxId: '12345678901',
    });

    assert.deepEqual(result, {
      paymentId: 'ORDE_CARD_1',
      status: 'approved',
      statusDetail: 'Pagamento aprovado',
    });

    const orderRequest = requireValue(requests[0]);
    assert.equal(orderRequest.url, 'https://pagbank.test/orders');
    assert.equal(orderRequest.method, 'POST');
    assert.equal(orderRequest.authorization, 'Bearer secret-token');

    const body = requireRecord(orderRequest.body);
    assert.equal(body.reference_id, 'order-1');
    assert.equal(body.notification_urls, undefined);

    const charges = requireArray(body.charges);
    const charge = requireRecord(requireValue(charges[0]));
    assert.equal(charge.reference_id, 'order-1');
    assert.equal(charge.description, 'Pedido #42');

    const amount = requireRecord(charge.amount);
    assert.equal(amount.value, 2990);
    assert.equal(amount.currency, 'BRL');

    const paymentMethod = requireRecord(charge.payment_method);
    assert.equal(paymentMethod.type, 'CREDIT_CARD');
    assert.equal(paymentMethod.installments, 2);
    assert.equal(paymentMethod.capture, true);

    const card = requireRecord(paymentMethod.card);
    assert.equal(card.encrypted, 'encrypted-card-token');
    assert.equal(card.store, false);

    const holder = requireRecord(paymentMethod.holder);
    assert.equal(holder.name, 'JOSE DA SILVA');
    assert.equal(holder.tax_id, '12345678901');

    const evidence = await readEvidenceLine(evidenceFile);
    const requestBody = requireRecord(evidence.requestBody);
    const evidenceCharges = requireArray(requestBody.charges);
    const evidenceCharge = requireRecord(requireValue(evidenceCharges[0]));
    const evidencePaymentMethod = requireRecord(evidenceCharge.payment_method);
    const evidenceCard = requireRecord(evidencePaymentMethod.card);
    assert.equal(evidenceCard.encrypted, '<encrypted-card:20:prefix:encrypted-card-t>');
  } finally {
    restoreFetch();
    await rm(tmp, { recursive: true, force: true });
  }
});

test('creates debit card payments with 3DS authentication payload and maps status detail', async (): Promise<void> => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'pagbank-gateway-debit-'));
  const evidenceFile = path.join(tmp, 'evidence.jsonl');
  const requests: RecordedRequest[] = [];
  const restoreFetch = replaceFetch(async (input, init): Promise<Response> => {
    requests.push({
      url: String(input),
      method: init?.method,
      authorization: new Headers(init?.headers).get('authorization'),
      body: parseRequestBody(init?.body),
    });

    return new Response(
      JSON.stringify({
        id: 'ORDE_DEBIT_1',
        reference_id: 'order-1',
        charges: [
          {
            status: 'AUTHORIZED',
            payment_response: {
              message: 'Autorizado',
            },
          },
        ],
      }),
      { status: 201 },
    );
  });

  try {
    const gateway = new PagBankPaymentGateway(createConfigService({
      API_PUBLIC_URL: 'https://api.example.com',
      PAGBANK_ACCESS_TOKEN: 'secret-token',
      PAGBANK_API_URL: 'https://pagbank.test',
      PAGBANK_ENV: 'sandbox',
      PAGBANK_EVIDENCE_ENABLED: 'true',
      PAGBANK_EVIDENCE_FILE: evidenceFile,
    }));

    const result = await gateway.createDebitCardPayment({
      order: createPaymentOrder(PaymentMethod.DEBIT_CARD),
      authenticationId: '3DS_authentication',
      cardholderName: 'JOSE DA SILVA',
      encryptedCard: 'encrypted-card-token',
      payerEmail: 'payer@example.com',
      payerTaxId: '12345678901',
    });

    assert.deepEqual(result, {
      paymentId: 'ORDE_DEBIT_1',
      status: 'pending',
      statusDetail: 'Autorizado',
    });

    const orderRequest = requireValue(requests[0]);
    assert.equal(orderRequest.url, 'https://pagbank.test/orders');
    assert.equal(orderRequest.method, 'POST');

    const body = requireRecord(orderRequest.body);
    assert.deepEqual(body.notification_urls, ['https://api.example.com/api/webhooks/pagbank']);

    const charges = requireArray(body.charges);
    const charge = requireRecord(requireValue(charges[0]));
    const paymentMethod = requireRecord(charge.payment_method);
    assert.equal(paymentMethod.type, 'DEBIT_CARD');
    assert.equal(paymentMethod.installments, 1);
    assert.equal(paymentMethod.capture, true);

    const authenticationMethod = requireRecord(paymentMethod.authentication_method);
    assert.equal(authenticationMethod.type, 'THREEDS');
    assert.equal(authenticationMethod.id, '3DS_authentication');
    const holder = requireRecord(paymentMethod.holder);
    assert.equal(holder.name, 'JOSE DA SILVA');
    assert.equal(holder.tax_id, '12345678901');

    const evidence = await readEvidenceLine(evidenceFile);
    const requestBody = requireRecord(evidence.requestBody);
    const evidenceCharges = requireArray(requestBody.charges);
    const evidenceCharge = requireRecord(requireValue(evidenceCharges[0]));
    const evidencePaymentMethod = requireRecord(evidenceCharge.payment_method);
    const evidenceAuthenticationMethod = requireRecord(evidencePaymentMethod.authentication_method);
    assert.equal(evidenceAuthenticationMethod.id, '<pagbank-3ds-auth:3DS_auth...>');
  } finally {
    restoreFetch();
    await rm(tmp, { recursive: true, force: true });
  }
});

test('fetches PagBank order status through the real gateway adapter and records sanitized evidence', async (): Promise<void> => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'pagbank-gateway-'));
  const evidenceFile = path.join(tmp, 'evidence.jsonl');
  const requests: RecordedRequest[] = [];
  const restoreFetch = replaceFetch(async (input, init): Promise<Response> => {
    requests.push({
      url: String(input),
      method: init?.method,
      authorization: new Headers(init?.headers).get('authorization'),
    });

    return new Response(
      JSON.stringify({
        id: 'ORDE_1',
        reference_id: 'order-1',
        customer: {
          email: 'cliente@example.com',
          tax_id: '12345678901',
        },
        charges: [{ status: 'PAID' }],
      }),
      { status: 200 },
    );
  });

  try {
    const gateway = new PagBankPaymentGateway(createConfigService({
      PAGBANK_ACCESS_TOKEN: 'secret-token',
      PAGBANK_API_URL: 'https://pagbank.test',
      PAGBANK_ENV: 'sandbox',
      PAGBANK_EVIDENCE_ENABLED: 'true',
      PAGBANK_EVIDENCE_FILE: evidenceFile,
    }));

    const result = await gateway.getPaymentStatus({ externalId: 'ORDE_1' });

    assert.deepEqual(result, {
      externalId: 'ORDE_1',
      referenceId: 'order-1',
      status: 'approved',
    });
    assert.deepEqual(requests, [
      {
        url: 'https://pagbank.test/orders/ORDE_1',
        method: 'GET',
        authorization: 'Bearer secret-token',
      },
    ]);

    const evidence = await readEvidenceLine(evidenceFile);
    assert.equal(evidence.path, '/orders/ORDE_1');
    assert.equal(evidence.method, 'GET');
    assert.equal(evidence.responseStatus, 200);

    const responseBody = requireRecord(evidence.responseBody);
    const customer = requireRecord(responseBody.customer);
    assert.equal(customer.email, 'cl*****@example.com');
    assert.equal(customer.tax_id, '123******01');
  } finally {
    restoreFetch();
    await rm(tmp, { recursive: true, force: true });
  }
});

test('formats PagBank error responses from the gateway adapter', async (): Promise<void> => {
  const restoreFetch = replaceFetch(async (): Promise<Response> => {
    return new Response(
      JSON.stringify({
        error_messages: [
          {
            code: 'E001',
            parameter_name: 'id',
            description: 'invalid order',
          },
        ],
      }),
      { status: 400 },
    );
  });

  try {
    const gateway = new PagBankPaymentGateway(createConfigService({
      PAGBANK_ACCESS_TOKEN: 'secret-token',
      PAGBANK_API_URL: 'https://pagbank.test',
      PAGBANK_EVIDENCE_ENABLED: 'false',
    }));

    await assert.rejects(
      () => gateway.getPaymentStatus({ externalId: 'ORDE_BAD' }),
      /E001 - id - invalid order/,
    );
  } finally {
    restoreFetch();
  }
});

function createConfigService(values: Record<string, string>): ConfigService {
  return new ConfigService(values);
}

function replaceFetch(fakeFetch: typeof fetch): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fakeFetch;

  return (): void => {
    globalThis.fetch = originalFetch;
  };
}

async function readEvidenceLine(file: string): Promise<Record<string, unknown>> {
  const lines = await readEvidenceLines(file);
  assert.equal(lines.length, 1);
  return requireValue(lines[0]);
}

async function readEvidenceLines(file: string): Promise<readonly Record<string, unknown>[]> {
  const content = await readFile(file, 'utf8');
  const lines = content.trim().split('\n');
  return lines.map((line): Record<string, unknown> => requireRecord(JSON.parse(line)));
}

function requireRecord(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function requireArray(value: unknown): readonly unknown[] {
  assert.equal(Array.isArray(value), true);
  return value as readonly unknown[];
}

function requireValue<T>(value: T | undefined): T {
  assert.notEqual(value, undefined);
  return value as T;
}

function parseRequestBody(body: RequestInit['body'] | undefined): unknown {
  return typeof body === 'string' ? JSON.parse(body) : undefined;
}

function createPaymentOrder(paymentMethod: PaymentMethod = PaymentMethod.PIX): PaymentOrder {
  return {
    id: 'order-1',
    orderNumber: 42,
    customerName: 'Cliente Teste',
    customerPhone: '81999999999',
    customerEmail: 'cliente@example.com',
    totalAmount: '29.90',
    paymentMethod,
    items: [
      {
        productName: 'Quentinha P',
        quantity: 1,
        subtotal: 29.9,
      },
    ],
    createdAt: new Date('2026-05-07T12:00:00.000Z'),
    updatedAt: new Date('2026-05-07T12:01:00.000Z'),
  };
}
