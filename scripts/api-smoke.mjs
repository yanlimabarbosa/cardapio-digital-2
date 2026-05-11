import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = (process.env.API_BASE_URL ?? 'http://localhost:3334').replace(/\/$/, '');

const checks = [
  publicJson('GET /api/store/status', '/api/store/status', (body) => {
    assertObject(body, 'store status body');
    assertKey(body, 'open');
    assertKey(body, 'weeklySchedule');
  }),
  publicJson('GET /api/menu', '/api/menu', (body) => {
    assertArray(body, 'menu body');
  }),
  publicJson('GET /api/menu/sections', '/api/menu/sections', (body) => {
    assertArray(body, 'menu sections body');
  }),
  validationJson('POST /api/orders invalid body', '/api/orders', {}),
  validationJson('POST /api/payments/pix invalid body', '/api/payments/pix', {
    orderId: 'not-a-uuid',
    payerEmail: 'invalid',
    payerTaxId: '111',
  }),
  pagBankWebhookNoop(),
];

let failed = false;

for (const check of checks) {
  try {
    await check();
  } catch (error) {
    failed = true;
    console.error(`not ok - ${error.message}`);
  }
}

if (failed) {
  process.exitCode = 1;
}

function publicJson(name, pathname, validate) {
  return async () => {
    const { response, body, durationMs } = await request(pathname);
    assertStatus(response, 200, name);
    validate(body);
    console.log(`ok - ${name} ${response.status} ${durationMs}ms`);
  };
}

function validationJson(name, pathname, payload) {
  return async () => {
    const { response, body, durationMs } = await request(pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assertStatus(response, 400, name);
    assertObject(body, `${name} body`);
    assertKey(body, 'message');
    console.log(`ok - ${name} ${response.status} ${durationMs}ms`);
  };
}

function pagBankWebhookNoop() {
  return async () => {
    const payload = JSON.stringify({
      id: `CHAR_SMOKE_${Date.now()}`,
      status: 'PAID',
    });
    const headers = { 'Content-Type': 'application/json' };
    const token = readEnvValue('PAGBANK_WEBHOOK_TOKEN');

    if (token) {
      headers['x-authenticity-token'] = createHash('sha256')
        .update(`${token}-${payload}`)
        .digest('hex');
    }

    const { response, body, durationMs } = await request('/api/webhooks/pagbank', {
      method: 'POST',
      headers,
      body: payload,
    });
    assertStatus(response, 200, 'POST /api/webhooks/pagbank no-op');
    assertObject(body, 'webhook body');
    if (body.received !== true) {
      throw new Error('webhook body.received should be true');
    }
    console.log(`ok - POST /api/webhooks/pagbank no-op ${response.status} ${durationMs}ms`);
  };
}

async function request(pathname, init) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const durationMs = Math.round(performance.now() - started);
  const text = await response.text();

  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${pathname} returned non-JSON response`);
  }

  return { response, body, durationMs };
}

function assertStatus(response, expected, name) {
  if (response.status !== expected) {
    throw new Error(`${name} expected HTTP ${expected}, got ${response.status}`);
  }
}

function assertObject(value, name) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`${name} should be an object`);
  }
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} should be an array`);
  }
}

function assertKey(value, key) {
  if (!(key in value)) {
    throw new Error(`missing key ${key}`);
  }
}

function readEnvValue(key) {
  if (process.env[key]) return process.env[key];

  for (const envPath of [join(process.cwd(), '.env'), join(process.cwd(), 'apps/api/.env')]) {
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, 'utf8');
    const line = content
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${key}=`));

    if (line) {
      return line
        .slice(key.length + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
    }
  }

  return '';
}
