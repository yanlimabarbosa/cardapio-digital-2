import { expect, test, type Page, type Response } from '@playwright/test';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const evidenceDir = path.join(process.cwd(), 'test-results', 'pagbank-homologation');
const backendEvidenceFile = path.join(evidenceDir, 'pagbank-backend-exchanges.jsonl');
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const e2eAdminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@bemcomer.com';
const e2eAdminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'BemComer@2026#Painel47';
const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

let originalStoreSettings: Record<string, unknown> | null = null;
let adminToken: string | null = null;
let homologationCategoryId: string | null = null;
const homologationProductsByAmount = new Map<number, { id: string; name: string }>();
const transientTokenRegressionAmountCents = 400;

type CapturedExchange = {
  method: string;
  url: string;
  status: number;
  requestBody: unknown;
  responseBody: unknown;
};

const approvedCreditCard = {
  number: '4539620659922097',
  month: '12',
  year: '2030',
  cvv: '123',
  holder: 'CLIENTE SANDBOX',
};

const deniedCreditCard = {
  number: '4929291898380766',
  month: '12',
  year: '2030',
  cvv: '123',
  holder: 'CLIENTE SANDBOX',
};

const invalidExpirationCreditCard = {
  number: '4539620659922097',
  month: '13',
  year: '2030',
  cvv: '123',
  holder: 'CLIENTE SANDBOX',
};

const invalidEncryptedCreditCard = {
  number: '1111111111111111',
  month: '12',
  year: '2030',
  cvv: '123',
  holder: 'CLIENTE SANDBOX',
};

const cardEncryptionErrorCases = [
  { code: 'INVALID_NUMBER', expectedMessage: 'Número do cartão inválido.' },
  { code: 'INVALID_SECURITY_CODE', expectedMessage: 'Código de segurança inválido.' },
  { code: 'INVALID_EXPIRATION_MONTH', expectedMessage: 'Mês de vencimento inválido.' },
  { code: 'INVALID_EXPIRATION_YEAR', expectedMessage: 'Ano de vencimento inválido.' },
  { code: 'INVALID_PUBLIC_KEY', expectedMessage: 'Chave pública do PagBank inválida. Avise o restaurante.' },
  { code: 'INVALID_HOLDER', expectedMessage: 'Nome do titular inválido.' },
] as const;

const approvedDebitCard3ds = {
  number: '6505050000001000',
  month: '12',
  year: '2029',
  cvv: '123',
  holder: 'JOSE DA SILVA',
};

type ThreeDsMatrixScenario = {
  brand: 'visa' | 'mastercard' | 'elo';
  cardNumber: string;
  amountCents: number;
  challenge: boolean;
  expectedChargeStatus: 'PAID' | 'DECLINED';
  expectedThreeDsStatus: 'AUTHENTICATED' | 'NOT_AUTHENTICATED';
};

const threeDsMatrix: ThreeDsMatrixScenario[] = [
  { brand: 'visa', cardNumber: '4000000000002701', amountCents: 2701, challenge: false, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'mastercard', cardNumber: '5200000000001005', amountCents: 1005, challenge: false, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'elo', cardNumber: '6505050000001000', amountCents: 1000, challenge: false, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'visa', cardNumber: '4000000000002503', amountCents: 2503, challenge: true, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'mastercard', cardNumber: '5200000000001096', amountCents: 1096, challenge: true, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'elo', cardNumber: '6505050000001091', amountCents: 1091, challenge: true, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'visa', cardNumber: '4000000000002925', amountCents: 2925, challenge: false, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'mastercard', cardNumber: '5200000000001013', amountCents: 1013, challenge: false, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'elo', cardNumber: '6505050000001018', amountCents: 1018, challenge: false, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'visa', cardNumber: '4000000000002370', amountCents: 2370, challenge: true, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'mastercard', cardNumber: '5200000000001104', amountCents: 1104, challenge: true, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'elo', cardNumber: '6505050000001109', amountCents: 1109, challenge: true, expectedChargeStatus: 'PAID', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'visa', cardNumber: '4000000000002701', amountCents: 4001, challenge: false, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'mastercard', cardNumber: '5200000000001005', amountCents: 5201, challenge: false, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'elo', cardNumber: '6505050000001005', amountCents: 4001, challenge: false, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'visa', cardNumber: '4000000000002503', amountCents: 4003, challenge: true, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'mastercard', cardNumber: '5200000000001096', amountCents: 5206, challenge: true, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'elo', cardNumber: '6505050000001091', amountCents: 6501, challenge: true, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'AUTHENTICATED' },
  { brand: 'visa', cardNumber: '4000000000002925', amountCents: 4005, challenge: false, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'mastercard', cardNumber: '5200000000001013', amountCents: 5203, challenge: false, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'elo', cardNumber: '6505050000001018', amountCents: 6508, challenge: false, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'visa', cardNumber: '4000000000002370', amountCents: 4000, challenge: true, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'mastercard', cardNumber: '5200000000001104', amountCents: 5204, challenge: true, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
  { brand: 'elo', cardNumber: '6505050000001109', amountCents: 6509, challenge: true, expectedChargeStatus: 'DECLINED', expectedThreeDsStatus: 'NOT_AUTHENTICATED' },
];

test.beforeAll(async () => {
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.rm(backendEvidenceFile, { force: true });
  adminToken = await loginAsAdmin();
  originalStoreSettings = await adminApi<Record<string, unknown>>('/api/admin/store-settings');
  await adminApi('/api/admin/store-settings', {
    method: 'PUT',
    body: JSON.stringify({ forceOpen: true, forceClose: false }),
  });
  await createThreeDsHomologationProducts();
});

test.afterAll(async () => {
  await cleanupThreeDsHomologationProducts();
  if (!originalStoreSettings || !adminToken) return;
  await adminApi('/api/admin/store-settings', {
    method: 'PUT',
    body: JSON.stringify({
      forceOpen: Boolean(originalStoreSettings.forceOpen),
      forceClose: Boolean(originalStoreSettings.forceClose),
    }),
  }).catch(() => undefined);
});

test('checkout blocks invalid payer e-mail before creating an order', async ({ page }) => {
  let orderRequestCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/orders')) {
      orderRequestCount += 1;
    }
  });

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente Email Invalido');
  await goToCheckout(page);
  await page.getByTestId('tab-pix').click();
  await page.getByPlaceholder('seu@email.com').fill('email-invalido');
  await page.getByPlaceholder('000.000.000-00').fill('09299641447');
  await page.getByTestId('pay-button').click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('alert').filter({ hasText: 'Informe um e-mail válido para continuar.' })).toBeVisible();
  await page.waitForTimeout(250);
  expect(orderRequestCount).toBe(0);
});

test('checkout blocks invalid payer CPF before creating an order', async ({ page }) => {
  let orderRequestCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/orders')) {
      orderRequestCount += 1;
    }
  });

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente CPF Invalido');
  await goToCheckout(page);
  await page.getByTestId('tab-pix').click();
  await page.getByPlaceholder('seu@email.com').fill('sandbox.validacao@cardapiobemcomer.com.br');
  await page.getByPlaceholder('000.000.000-00').fill('11111111111');
  await page.getByTestId('pay-button').click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('alert').filter({ hasText: 'Informe um CPF válido para continuar.' })).toBeVisible();
  await page.waitForTimeout(250);
  expect(orderRequestCount).toBe(0);
});

test('payment APIs reject malformed payer data before PagBank gateway calls', async () => {
  const validOrderId = '11111111-1111-4111-8111-111111111111';

  const pixResponse = await fetch(`${apiBaseUrl}/api/payments/pix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: validOrderId,
      payerEmail: 'sandbox.validacao@cardapiobemcomer.com.br',
      payerTaxId: '111',
    }),
  });
  const creditResponse = await fetch(`${apiBaseUrl}/api/payments/credit-card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: validOrderId,
      encryptedCard: 'encrypted-card',
      installments: 0,
      payerEmail: 'sandbox.validacao@cardapiobemcomer.com.br',
      identificationType: 'CPF',
      identificationNumber: '111',
    }),
  });
  const debitResponse = await fetch(`${apiBaseUrl}/api/payments/debit-card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: validOrderId,
      encryptedCard: 'encrypted-card',
      authenticationId: 'invalid-auth-id',
      payerEmail: 'sandbox.validacao@cardapiobemcomer.com.br',
      identificationType: 'CPF',
      identificationNumber: '111',
    }),
  });

  expect(pixResponse.status).toBe(400);
  expect(creditResponse.status).toBe(400);
  expect(debitResponse.status).toBe(400);

  const pixBody = await pixResponse.json();
  const creditBody = await creditResponse.json();
  const debitBody = await debitResponse.json();

  expect(JSON.stringify(pixBody)).toContain('payerTaxId');
  expect(JSON.stringify(creditBody)).toContain('installments');
  expect(JSON.stringify(creditBody)).toContain('identificationNumber');
  expect(JSON.stringify(debitBody)).toContain('authenticationId');
  expect(JSON.stringify(debitBody)).toContain('identificationNumber');
});

test('credit card payment UI uses the API order total instead of the local cart total', async ({ page }) => {
  await overrideNextOrderTotal(page, 12.34);

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente Total API Credito');
  await goToCheckout(page);
  await selectCardAndCreateOrder(page);

  await expect(page.getByRole('heading', { name: /pagamento com cartão/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pagar R\$ 12,34/i })).toBeVisible();
  await expect(page.locator('select')).toContainText('1x de R$ 12,34');
  await expect(page.getByRole('button', { name: /Pagar R\$ 17,00/i })).toHaveCount(0);
});

test('debit card 3DS authentication uses the API order total as amount.value', async ({ page }) => {
  await overrideNextOrderTotal(page, 12.34);

  let debitPaymentBody: Record<string, unknown> | null = null;
  await page.route('**/api/payments/3ds-session', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ session: 'S'.repeat(160), expiresAt: Date.now() + 30 * 60 * 1000 }),
    });
  });
  await page.route('**/api/payments/debit-card', async (route) => {
    debitPaymentBody = parseJson(route.request().postData()) as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ paymentId: 'ORDE_TEST_TOTAL', status: 'approved', statusDetail: 'SUCESSO' }),
    });
  });

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente Total API Debito');
  await goToCheckout(page);
  await selectDebitCardAndCreateOrder(page);
  await fillDebitCardForm(page, approvedDebitCard3ds);
  await mockPagBankSuccessful3ds(page);

  await expect(page.getByRole('heading', { name: /pagamento no débito/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pagar no débito R\$ 12,34/i })).toBeVisible();
  await page.locator('form button[type="submit"]').click();

  await expect
    .poll(() => page.evaluate(() => (window as any).__pagbank3dsAmount))
    .toBe(1234);
  await expect
    .poll(() => debitPaymentBody)
    .toEqual(expect.objectContaining({
      encryptedCard: 'encrypted-card-for-total-test',
      authenticationId: '3DS_TOTAL_TEST',
    }));
});

test('pix sandbox checkout creates a PagBank QR Code', async ({ page }, testInfo) => {
  const capture = captureLocalPaymentApi(page);

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente Sandbox Pix');
  await goToCheckout(page);
  await selectPixAndFillPayer(page);

  const orderResponsePromise = waitForPostResponse(page, '/api/orders');
  const pixResponsePromise = page.waitForResponse((response) => response.url().includes('/api/payments/pix'));
  await page.getByTestId('pay-button').click();
  await expect(page.getByRole('heading', { name: /criando seu pedido/i })).toBeVisible();
  const orderResponse = await orderResponsePromise;
  const pixResponse = await pixResponsePromise;
  const orderBody = await orderResponse.json();
  const pixBody = await pixResponse.json();
  const qrImage = page.getByRole('img', { name: 'QR Code Pix' });

  expectCreatedOrderApi(orderResponse, orderBody, {
    customerName: 'Cliente Sandbox Pix',
    paymentMethod: 'pix',
    totalAmount: 17,
    productName: 'Quentinha P',
  });
  expect(pixResponse.status()).toBe(201);
  expectRequestBody(pixResponse, {
    orderId: orderBody.id,
    payerEmail: 'sandbox.pix@cardapiobemcomer.com.br',
    payerTaxId: '09299641447',
  });
  expect(pixBody.paymentId).toMatch(/^ORDE_/);
  expect(pixBody.qrCode.length).toBeGreaterThan(50);
  expect(pixBody.qrCodeBase64.length).toBeGreaterThan(100);
  await expectBackendPagBankEvidence({
    referenceId: orderBody.id,
    service: 'orders-api',
    path: '/orders',
  });
  await expectBackendPagBankEvidence({
    service: 'qrcode-api',
    pathIncludes: '/qrcode/',
  });

  await expect(page.getByRole('heading', { name: /pagamento via pix/i })).toBeVisible();
  await expect(page.getByText('R$ 17,00')).toBeVisible();
  await expect(qrImage).toBeVisible();
  await expect
    .poll(() => qrImage.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))
    .toBe(true);
  await expect(page.getByText('Escaneie com o app do seu banco')).toBeVisible();
  await expect(page.getByText('Ou copie o código Pix')).toBeVisible();
  await expect(page.getByText(pixBody.qrCode.slice(0, 40))).toBeVisible();
  await expect(page.getByText(/Aguardando pagamento/i)).toBeVisible();
  await expect(page.getByText(/Expira em \d{2}:\d{2}/i)).toBeVisible();
  await page.getByRole('button', { name: /Copiar código Pix/i }).click();
  await expect(page.getByText('Código copiado!')).toBeVisible();

  await writeEvidence(testInfo, {
    flow: 'pix-sandbox-checkout',
    assertion: 'Pix QR Code generated by the application using PagBank sandbox.',
    paymentId: pixBody.paymentId,
    qrCodeLength: pixBody.qrCode.length,
    qrCodeBase64Length: pixBody.qrCodeBase64.length,
    expiresAt: pixBody.expiresAt,
    exchanges: capture.exchanges,
  });
});

test('pix checkout redirects to paid order when a mocked PagBank webhook confirms payment', async ({ page }) => {
  await page.route('**/api/payments/pix', async (route) => {
    const body = parseJson(route.request().postData()) as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        paymentId: 'ORDE_E2E_PIX_WEBHOOK',
        qrCode: '00020101021226860014br.gov.bcb.pix2564pix-homologacao-cardapiobemcomer520400005303986540517.005802BR5909BEM COMER6009CAMPINA62070503***6304ABCD',
        qrCodeBase64: transparentPngBase64,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        orderId: body.orderId,
      }),
    });
  });

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente Pix Webhook');
  await goToCheckout(page);
  await selectPixAndFillPayer(page);

  const orderResponsePromise = waitForPostResponse(page, '/api/orders');
  await page.getByTestId('pay-button').click();
  const orderResponse = await orderResponsePromise;
  const orderBody = await orderResponse.json();

  expectCreatedOrderApi(orderResponse, orderBody, {
    customerName: 'Cliente Pix Webhook',
    paymentMethod: 'pix',
    totalAmount: 17,
    productName: 'Quentinha P',
  });

  await expect(page.getByRole('heading', { name: /pagamento via pix/i })).toBeVisible();
  await expect(page.getByText(/Aguardando pagamento/i)).toBeVisible();

  const webhookResponse = await postMockedPagBankWebhook({
    id: `CHAR_E2E_PIX_WEBHOOK_${Date.now()}`,
    reference_id: orderBody.id,
    status: 'PAID',
  });
  expect(webhookResponse.status).toBe(200);

  await expect.poll(async () => {
    const response = await fetch(`${apiBaseUrl}/api/payments/${orderBody.id}/status`);
    return response.json();
  }, { timeout: 15_000 }).toMatchObject({
    orderStatus: 'paid',
    paymentStatus: 'approved',
  });

  await expect(page).toHaveURL(new RegExp(`/order/${orderBody.id}`), { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /Pedido #/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Pago$/i })).toBeVisible();
});

test('credit card sandbox checkout approves an authorized card with encrypted card data', async ({ page }, testInfo) => {
  const capture = captureLocalPaymentApi(page);

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente Sandbox Credito Aprovado');
  await goToCheckout(page);
  const orderResponsePromise = waitForPostResponse(page, '/api/orders');
  await selectCardAndCreateOrder(page);
  const orderResponse = await orderResponsePromise;
  const orderBody = await orderResponse.json();
  await fillCreditCardForm(page, approvedCreditCard);

  const cardResponsePromise = page.waitForResponse((response) => response.url().includes('/api/payments/credit-card'));
  const submitButton = page.locator('form button[type="submit"]');
  await submitButton.click();
  await expect(submitButton).toBeDisabled();
  await expect(submitButton).toContainText('Processando...');
  const cardResponse = await cardResponsePromise;
  const cardBody = await cardResponse.json();

  expectCreatedOrderApi(orderResponse, orderBody, {
    customerName: 'Cliente Sandbox Credito Aprovado',
    paymentMethod: 'credit_card',
    totalAmount: 17,
    productName: 'Quentinha P',
  });
  expect(cardResponse.status()).toBe(201);
  expectEncryptedCardRequest(cardResponse, {
    orderId: orderBody.id,
    payerEmail: 'sandbox.cartao@cardapiobemcomer.com.br',
    identificationNumber: '09299641447',
    installments: 1,
    plaintextCard: approvedCreditCard,
  });
  expect(cardBody.paymentId).toMatch(/^ORDE_/);
  expect(cardBody.status).toBe('approved');
  expect(cardBody.statusDetail).toBe('SUCESSO');
  await expectBackendPagBankEvidence({
    referenceId: orderBody.id,
    service: 'orders-api',
    path: '/orders',
    expectedPaymentType: 'CREDIT_CARD',
  });

  await page.waitForURL(/\/order\//);
  await expectPaidOrderPage(page, 'Cliente Sandbox Credito Aprovado', 'Quentinha P');

  await writeEvidence(testInfo, {
    flow: 'credit-card-approved-sandbox-checkout',
    assertion: 'Authorized sandbox card was encrypted in browser and approved by PagBank sandbox.',
    paymentId: cardBody.paymentId,
    status: cardBody.status,
    statusDetail: cardBody.statusDetail,
    exchanges: capture.exchanges,
  });
});

test('credit card sandbox checkout rejects a denied card with encrypted card data', async ({ page }, testInfo) => {
  const capture = captureLocalPaymentApi(page);

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente Sandbox Credito Negado');
  await goToCheckout(page);
  const orderResponsePromise = waitForPostResponse(page, '/api/orders');
  await selectCardAndCreateOrder(page);
  const orderResponse = await orderResponsePromise;
  const orderBody = await orderResponse.json();
  await fillCreditCardForm(page, deniedCreditCard);

  const cardResponsePromise = page.waitForResponse((response) => response.url().includes('/api/payments/credit-card'));
  const submitButton = page.locator('form button[type="submit"]');
  await submitButton.click();
  await expect(submitButton).toBeDisabled();
  await expect(submitButton).toContainText('Processando...');
  const cardResponse = await cardResponsePromise;
  const cardBody = await cardResponse.json();

  expectCreatedOrderApi(orderResponse, orderBody, {
    customerName: 'Cliente Sandbox Credito Negado',
    paymentMethod: 'credit_card',
    totalAmount: 17,
    productName: 'Quentinha P',
  });
  expect(cardResponse.status()).toBe(201);
  expectEncryptedCardRequest(cardResponse, {
    orderId: orderBody.id,
    payerEmail: 'sandbox.cartao@cardapiobemcomer.com.br',
    identificationNumber: '09299641447',
    installments: 1,
    plaintextCard: deniedCreditCard,
  });
  expect(cardBody.paymentId).toMatch(/^ORDE_/);
  expect(cardBody.status).toBe('rejected');
  expect(cardBody.statusDetail).toBeTruthy();
  await expectBackendPagBankEvidence({
    referenceId: orderBody.id,
    service: 'orders-api',
    path: '/orders',
    expectedPaymentType: 'CREDIT_CARD',
  });

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: /pagamento com cartão/i })).toBeVisible();
  const deniedPaymentAlert = page.getByRole('alert').filter({ hasText: /Pagamento recusado/i });
  await expect(deniedPaymentAlert).toBeVisible();
  await expect(deniedPaymentAlert).toHaveText(/Pagamento recusado\. Tente outro cartão\./i);
  await expect(page.getByRole('button', { name: /Pagar R\$/i })).toBeEnabled();
  await expect(page.getByText(/Problemas com o cartão/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Pagar com Pix/i })).toBeVisible();

  await writeEvidence(testInfo, {
    flow: 'credit-card-denied-sandbox-checkout',
    assertion: 'Denied sandbox card was encrypted in browser and rejected by PagBank sandbox.',
    paymentId: cardBody.paymentId,
    status: cardBody.status,
    statusDetail: cardBody.statusDetail,
    exchanges: capture.exchanges,
  });
});

test('credit card form blocks PagBank encryption errors before payment API call', async ({ page }) => {
  let creditCardPaymentRequestCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/payments/credit-card')) {
      creditCardPaymentRequestCount += 1;
    }
  });

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente Cartao Invalido');
  await goToCheckout(page);
  await selectCardAndCreateOrder(page);
  await fillCreditCardForm(page, invalidExpirationCreditCard);

  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: /pagamento com cartão/i })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Mês de vencimento inválido.' })).toBeVisible();
  await page.waitForTimeout(250);
  expect(creditCardPaymentRequestCount).toBe(0);
});

test.describe('PagBank encryption errors translated in checkout', () => {
  for (const errorCase of cardEncryptionErrorCases) {
    test(`shows ${errorCase.code} in Portuguese and blocks payment API`, async ({ page }) => {
      let creditCardPaymentRequestCount = 0;
      page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api/payments/credit-card')) {
          creditCardPaymentRequestCount += 1;
        }
      });

      await addQuentinhaToCart(page);
      await fillCartCustomerData(page, `Cliente ${errorCase.code}`);
      await goToCheckout(page);
      await selectCardAndCreateOrder(page);
      await fillCreditCardForm(page, approvedCreditCard);
      await mockPagBankCardEncryptionError(page, errorCase.code);

      await page.locator('form button[type="submit"]').click();

      await expect(page).toHaveURL(/\/checkout$/);
      await expect(page.getByRole('heading', { name: /pagamento com cartão/i })).toBeVisible();
      await expect(page.getByRole('alert').filter({ hasText: errorCase.expectedMessage })).toBeVisible();
      await page.waitForTimeout(250);
      expect(creditCardPaymentRequestCount).toBe(0);
    });
  }
});

test('credit card form shows a friendly message when PagBank rejects encrypted card data', async ({ page }) => {
  let creditCardPaymentRequestCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/payments/credit-card')) {
      creditCardPaymentRequestCount += 1;
    }
  });

  await addQuentinhaToCart(page);
  await fillCartCustomerData(page, 'Cliente Cartao Criptografado Invalido');
  await goToCheckout(page);
  await selectCardAndCreateOrder(page);
  await fillCreditCardForm(page, invalidEncryptedCreditCard);

  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: /pagamento com cartão/i })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Dados do cartão inválidos. Confira número, validade, CVV e nome.' })).toBeVisible();
  expect(creditCardPaymentRequestCount).toBe(1);
  await expectBackendPagBankEvidence({
    service: 'orders-api',
    path: '/orders',
    expectedPaymentType: 'CREDIT_CARD',
  });
});

test('debit card sandbox checkout approves with PagBank 3DS and encrypted card data', async ({ page }, testInfo) => {
  const capture = captureLocalPaymentApi(page);

  await addProductToCart(page, 'Guaraná 1L');
  await fillCartCustomerData(page, 'Jose da Silva');
  await goToCheckout(page);
  const orderResponsePromise = waitForPostResponse(page, '/api/orders');
  await selectDebitCardAndCreateOrder(page);
  const orderResponse = await orderResponsePromise;
  const orderBody = await orderResponse.json();
  await fillDebitCardForm(page, approvedDebitCard3ds);

  const sessionResponsePromise = page.waitForResponse((response) => response.url().includes('/api/payments/3ds-session'));
  const debitResponsePromise = page.waitForResponse((response) => response.url().includes('/api/payments/debit-card'));
  const submitButton = page.locator('form button[type="submit"]');
  await submitButton.click();
  await expect(submitButton).toBeDisabled();
  await expect(submitButton).toContainText('Autenticando...');
  const sessionResponse = await sessionResponsePromise;
  const debitResponse = await debitResponsePromise;
  const sessionBody = await sessionResponse.json();
  const debitBody = await debitResponse.json();

  expectCreatedOrderApi(orderResponse, orderBody, {
    customerName: 'Jose da Silva',
    paymentMethod: 'debit_card',
    totalAmount: 10,
    productName: 'Guaraná 1L',
  });
  expect(sessionResponse.status()).toBe(201);
  expect(sessionBody.session.length).toBeGreaterThan(100);
  expect(sessionBody.expiresAt).toBeGreaterThan(Date.now());
  expect(debitResponse.status()).toBe(201);
  expectDebitCardRequest(debitResponse, {
    orderId: orderBody.id,
    payerEmail: 'sandbox.debito@cardapiobemcomer.com.br',
    identificationNumber: '09299641447',
    plaintextCard: approvedDebitCard3ds,
  });
  expect(debitBody.paymentId).toMatch(/^ORDE_/);
  expect(debitBody.status).toBe('approved');
  expect(debitBody.statusDetail).toBe('SUCESSO');
  await expectBackendPagBankEvidence({
    service: 'sdk-api',
    path: '/checkout-sdk/sessions',
  });
  await expectBackendPagBankEvidence({
    referenceId: orderBody.id,
    service: 'orders-api',
    path: '/orders',
    expectedPaymentType: 'DEBIT_CARD',
  });

  await page.waitForURL(/\/order\//);
  await expectPaidOrderPage(page, 'Jose da Silva', 'Guaraná 1L');

  await writeEvidence(testInfo, {
    flow: 'debit-card-3ds-approved-sandbox-checkout',
    assertion: 'Debit sandbox card was authenticated with PagBank 3DS, encrypted in browser, and approved by PagBank sandbox.',
    paymentId: debitBody.paymentId,
    status: debitBody.status,
    statusDetail: debitBody.statusDetail,
    exchanges: capture.exchanges,
  });
});

test('debit card checkout translates PagBank transient token errors for unsupported card and amount combinations', async ({ page }, testInfo) => {
  const capture = captureLocalPaymentApi(page);
  const product = homologationProductsByAmount.get(transientTokenRegressionAmountCents);
  expect(product, `Missing transient-token regression product for amount ${transientTokenRegressionAmountCents}`).toBeTruthy();

  await addProductToCart(page, product!.name);
  await fillCartCustomerData(page, 'Cliente Debito Cartao Credito');
  await goToCheckout(page);

  const orderResponsePromise = waitForPostResponse(page, '/api/orders');
  await selectDebitCardAndCreateOrder(page);
  const orderResponse = await orderResponsePromise;
  const orderBody = await orderResponse.json();
  await fillDebitCardForm(page, approvedDebitCard3ds);

  const sessionResponsePromise = page.waitForResponse((response) => response.url().includes('/api/payments/3ds-session'));
  const debitResponsePromise = page.waitForResponse((response) => response.url().includes('/api/payments/debit-card'));
  const submitButton = page.locator('form button[type="submit"]');
  await submitButton.click();
  await expect(submitButton).toBeDisabled();
  await expect(submitButton).toContainText('Autenticando...');
  await expect(page.getByTestId('debit-3ds-status')).toBeVisible();

  const sessionResponse = await sessionResponsePromise;
  const debitResponse = await debitResponsePromise;
  const sessionBody = await sessionResponse.json();
  const debitBody = await debitResponse.json();

  expectCreatedOrderApi(orderResponse, orderBody, {
    customerName: 'Cliente Debito Cartao Credito',
    paymentMethod: 'debit_card',
    totalAmount: transientTokenRegressionAmountCents / 100,
    productName: product!.name,
  });
  expect(sessionResponse.status()).toBe(201);
  expect(sessionBody.session.length).toBeGreaterThan(100);
  expect(debitResponse.status()).toBe(400);
  expectDebitCardRequest(debitResponse, {
    orderId: orderBody.id,
    payerEmail: 'sandbox.debito@cardapiobemcomer.com.br',
    identificationNumber: '09299641447',
    plaintextCard: approvedDebitCard3ds,
  });
  expect(JSON.stringify(debitBody)).toContain('transientToken');

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole('heading', { name: /pagamento no débito/i })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Cartão de débito inválido ou não aceito. Use outro cartão ou Pix.' })).toBeVisible();
  await expect(page.getByText(/transientToken/i)).not.toBeVisible();
  await expect(page.getByRole('button', { name: /Pagar no débito/i })).toBeEnabled();
  await expect(page.getByRole('button', { name: /Pagar com Pix/i })).toBeVisible();
  await expectBackendPagBankEvidence({
    referenceId: orderBody.id,
    service: 'orders-api',
    path: '/orders',
    expectedPaymentType: 'DEBIT_CARD',
  });

  await writeEvidence(testInfo, {
    flow: 'debit-card-transient-token-regression',
    assertion: 'PagBank transientToken debit errors are translated to a customer-friendly Portuguese message.',
    orderId: orderBody.id,
    status: debitResponse.status(),
    gatewayMessageWasInternal: JSON.stringify(debitBody).includes('transientToken'),
    exchanges: capture.exchanges,
  });
});

test.describe('PagBank 3DS documented sandbox matrix', () => {
  for (const [index, scenario] of threeDsMatrix.entries()) {
    test(`${String(index + 1).padStart(2, '0')} ${scenario.brand} ${scenario.amountCents} -> ${scenario.expectedChargeStatus} / ${scenario.expectedThreeDsStatus}${scenario.challenge ? ' with challenge' : ' without challenge'}`, async ({ page }, testInfo) => {
      const capture = captureLocalPaymentApi(page);
      const product = homologationProductsByAmount.get(scenario.amountCents);
      expect(product, `Missing homologation product for amount ${scenario.amountCents}`).toBeTruthy();

      await addProductToCart(page, product!.name);
      await fillCartCustomerData(page, `Cliente 3DS ${scenario.brand.toUpperCase()}`);
      await goToCheckout(page);

      const orderResponsePromise = waitForPostResponse(page, '/api/orders');
      await selectDebitCardAndCreateOrder(page);
      const orderResponse = await orderResponsePromise;
      const orderBody = await orderResponse.json();
      await fillDebitCardForm(page, {
        number: scenario.cardNumber,
        month: '12',
        year: '2029',
        cvv: '123',
        holder: 'JOSE DA SILVA',
      });

      let challengeDialogSeen = false;
      if (scenario.challenge) {
        page.once('dialog', async (dialog) => {
          challengeDialogSeen = true;
          expect(dialog.type()).toBe('confirm');
          expect(dialog.message()).toContain('confirme essa transação');
          await dialog.accept();
        });
      }

      const sessionResponsePromise = page.waitForResponse((response) => response.url().includes('/api/payments/3ds-session'));
      const expectedDebitOutcome = getExpectedDebitOutcome(scenario);
      const debitResponsePromise =
        expectedDebitOutcome === 'unsupported'
          ? null
          : page.waitForResponse((response) => response.url().includes('/api/payments/debit-card'));
      const submitButton = page.locator('form button[type="submit"]');
      await submitButton.click();
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toContainText('Autenticando...');
      await expect(page.getByTestId('debit-3ds-status')).toBeVisible();

      if (scenario.challenge) {
        await expect(page.getByTestId('debit-3ds-status')).toContainText(/Confirme a autenticação|Autenticando com o banco emissor|Enviando pagamento/i, { timeout: 20_000 });
      }

      const sessionResponse = await sessionResponsePromise;
      const sessionBody = await sessionResponse.json();

      expectCreatedOrderApi(orderResponse, orderBody, {
        customerName: `Cliente 3DS ${scenario.brand.toUpperCase()}`,
        paymentMethod: 'debit_card',
        totalAmount: scenario.amountCents / 100,
        productName: product!.name,
      });
      expect(sessionResponse.status()).toBe(201);
      expect(sessionBody.session.length).toBeGreaterThan(100);
      expect(sessionBody.expiresAt).toBeGreaterThan(Date.now());

      if (expectedDebitOutcome === 'unsupported') {
        await expect(page.getByRole('alert').filter({ hasText: /Cartão não elegível para 3DS/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Pagar no débito/i })).toBeEnabled();
        await expect(page.getByRole('button', { name: /Pagar com Pix/i })).toBeVisible();
        await page.waitForTimeout(1_000);
        expect(capture.exchanges.some((exchange) => exchange.url.includes('/api/payments/debit-card'))).toBe(false);

        await writeEvidence(testInfo, {
          flow: 'debit-card-3ds-documented-sandbox-matrix',
          assertion: 'PagBank documented 3DS sandbox case reached an AUTH_NOT_SUPPORTED debit outcome and was blocked before charge creation.',
          scenario: sanitize({
            ...scenario,
            productName: product!.name,
            orderId: orderBody.id,
            appStatus: 'unsupported',
            debitChargeAttempted: false,
          }),
          exchanges: capture.exchanges,
        });
        return;
      }

      const debitResponse = await debitResponsePromise!;
      const debitBody = await debitResponse.json();
      if (scenario.challenge) {
        expect(challengeDialogSeen).toBe(true);
      }
      expect(debitResponse.status()).toBe(201);
      expectDebitCardRequest(debitResponse, {
        orderId: orderBody.id,
        payerEmail: 'sandbox.debito@cardapiobemcomer.com.br',
        identificationNumber: '09299641447',
        plaintextCard: { number: scenario.cardNumber, holder: 'JOSE DA SILVA' },
      });
      expect(debitBody.paymentId).toMatch(/^ORDE_/);
      expect(debitBody.status).toBe(expectedDebitOutcome);

      await expectBackendPagBankEvidence({
        referenceId: orderBody.id,
        service: 'orders-api',
        path: '/orders',
        expectedPaymentType: 'DEBIT_CARD',
        expectedChargeStatus: expectedDebitOutcome === 'approved' ? 'PAID' : 'DECLINED',
        expectedThreeDsStatus: scenario.expectedThreeDsStatus,
      });

      if (expectedDebitOutcome === 'approved') {
        await page.waitForURL(/\/order\//);
        await expectPaidOrderPage(page, `Cliente 3DS ${scenario.brand.toUpperCase()}`, product!.name);
      } else {
        await expect(page).toHaveURL(/\/checkout$/);
        await expect(page.getByRole('heading', { name: /pagamento no débito/i })).toBeVisible();
        await expect(page.getByRole('alert').filter({ hasText: /Pagamento recusado/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Pagar no débito/i })).toBeEnabled();
        await expect(page.getByRole('button', { name: /Pagar com Pix/i })).toBeVisible();
      }

      await writeEvidence(testInfo, {
        flow: 'debit-card-3ds-documented-sandbox-matrix',
        assertion: 'PagBank documented 3DS sandbox case completed through checkout UI.',
        scenario: sanitize({
          ...scenario,
          productName: product!.name,
          orderId: orderBody.id,
          paymentId: debitBody.paymentId,
          appStatus: debitBody.status,
          statusDetail: debitBody.statusDetail,
          documentedChargeStatus: scenario.expectedChargeStatus,
          debitChargeStatus: expectedDebitOutcome === 'approved' ? 'PAID' : 'DECLINED',
        }),
        exchanges: capture.exchanges,
      });
    });
  }
});

function captureLocalPaymentApi(page: Page) {
  const exchanges: CapturedExchange[] = [];

  page.on('response', async (response: Response) => {
    const url = response.url();
    const isPaymentCall =
      url.includes('/api/orders') ||
      url.includes('/api/payments/pix') ||
      url.includes('/api/payments/credit-card') ||
      url.includes('/api/payments/3ds-session') ||
      url.includes('/api/payments/debit-card');

    if (!isPaymentCall) return;

    const request = response.request();
    const requestBody = parseJson(request.postData());
    const responseBody = parseJson(await safeResponseText(response));

    exchanges.push({
      method: request.method(),
      url,
      status: response.status(),
      requestBody: sanitize(requestBody),
      responseBody: sanitize(responseBody),
    });
  });

  return { exchanges };
}

function waitForPostResponse(page: Page, path: string) {
  return page.waitForResponse((response) =>
    response.url().includes(path) &&
    response.request().method() === 'POST',
  );
}

function expectCreatedOrderApi(
  response: Response,
  body: any,
  expected: {
    customerName: string;
    paymentMethod: 'pix' | 'credit_card' | 'debit_card';
    totalAmount: number;
    productName: string;
  },
) {
  expect(response.status()).toBe(201);
  expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(body.orderNumber).toEqual(expect.any(Number));
  expect(body.customerName).toBe(expected.customerName);
  expect(body.status).toBe('pending_payment');
  expect(body.paymentMethod).toBe(expected.paymentMethod);
  expect(body.totalAmount).toBe(expected.totalAmount);
  expect(body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        productName: expect.stringContaining(expected.productName),
        quantity: 1,
      }),
    ]),
  );
}

function expectRequestBody(response: Response, expected: Record<string, unknown>) {
  expect(parseJson(response.request().postData())).toEqual(expect.objectContaining(expected));
}

function getExpectedDebitOutcome(scenario: ThreeDsMatrixScenario): 'approved' | 'rejected' | 'unsupported' {
  if (scenario.cardNumber === '6505050000001005' && scenario.amountCents === 4001) {
    return 'unsupported';
  }

  if (!scenario.challenge && scenario.expectedThreeDsStatus === 'NOT_AUTHENTICATED') {
    return 'unsupported';
  }

  if (scenario.expectedChargeStatus === 'PAID' && scenario.expectedThreeDsStatus === 'NOT_AUTHENTICATED') {
    return 'rejected';
  }

  return scenario.expectedChargeStatus === 'PAID' ? 'approved' : 'rejected';
}

function expectEncryptedCardRequest(
  response: Response,
  expected: {
    orderId: string;
    payerEmail: string;
    identificationNumber: string;
    installments: number;
    plaintextCard: { number: string; holder: string };
  },
) {
  const body = parseJson(response.request().postData()) as Record<string, unknown>;
  expect(body).toEqual(expect.objectContaining({
    orderId: expected.orderId,
    payerEmail: expected.payerEmail,
    identificationType: 'CPF',
    identificationNumber: expected.identificationNumber,
    installments: expected.installments,
  }));
  expect(body.encryptedCard).toEqual(expect.any(String));
  expect(String(body.encryptedCard).length).toBeGreaterThan(100);
  expect(JSON.stringify(body)).not.toContain(expected.plaintextCard.number);
  expect(JSON.stringify(body)).not.toContain(expected.plaintextCard.holder);
  expect(body).not.toHaveProperty('number');
  expect(body).not.toHaveProperty('securityCode');
  expect(body).not.toHaveProperty('cvv');
  expect(body).not.toHaveProperty('expMonth');
  expect(body).not.toHaveProperty('expYear');
}

function expectDebitCardRequest(
  response: Response,
  expected: {
    orderId: string;
    payerEmail: string;
    identificationNumber: string;
    plaintextCard: { number: string; holder: string };
  },
) {
  const body = parseJson(response.request().postData()) as Record<string, unknown>;
  expect(body).toEqual(expect.objectContaining({
    orderId: expected.orderId,
    payerEmail: expected.payerEmail,
    identificationType: 'CPF',
    identificationNumber: expected.identificationNumber,
  }));
  expect(body.encryptedCard).toEqual(expect.any(String));
  expect(String(body.encryptedCard).length).toBeGreaterThan(100);
  expect(body.authenticationId).toEqual(expect.stringMatching(/^3DS_/));
  expect(JSON.stringify(body)).not.toContain(expected.plaintextCard.number);
  expect(JSON.stringify(body)).not.toContain(expected.plaintextCard.holder);
  expect(body).not.toHaveProperty('number');
  expect(body).not.toHaveProperty('securityCode');
  expect(body).not.toHaveProperty('cvv');
  expect(body).not.toHaveProperty('expMonth');
  expect(body).not.toHaveProperty('expYear');
}

async function addQuentinhaToCart(page: Page) {
  await resetCart(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('button').filter({ hasText: 'Quentinha P — Almoço' }).first().click();
  await page.locator('button').filter({ hasText: 'Arroz branco' }).last().click();
  await page.locator('button').filter({ hasText: 'Frango guisado' }).last().click();
  await page.getByTestId('confirm-add-to-cart').last().click();
  await page.getByTestId('view-cart').click();
  await page.waitForURL('**/cart');
}

async function addProductToCart(page: Page, productName: string) {
  await resetCart(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator('button').filter({ hasText: productName }).first().click();
  await page.getByTestId('confirm-add-to-cart').last().click();
  await page.getByTestId('view-cart').click();
  await page.waitForURL('**/cart');
}

async function resetCart(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('cardapio-cart'));
}

async function overrideNextOrderTotal(page: Page, totalAmount: number) {
  let handled = false;
  await page.route('**/api/orders', async (route) => {
    if (handled || route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    handled = true;
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: {
        ...body,
        totalAmount,
      },
    });
  });
}

async function fillCartCustomerData(page: Page, customerName: string) {
  await page.getByTestId('delivery-pickup').click();
  await page.getByTestId('customer-name').fill(customerName);
  await page.getByTestId('customer-phone').fill('(83) 99999-9999');
}

async function goToCheckout(page: Page) {
  await page.getByTestId('go-to-payment').click();
  await page.waitForURL('**/checkout');
}

async function selectPixAndFillPayer(page: Page) {
  await page.getByTestId('tab-pix').click();
  await page.getByPlaceholder('seu@email.com').fill('sandbox.pix@cardapiobemcomer.com.br');
  await page.getByPlaceholder('000.000.000-00').fill('09299641447');
}

async function selectCardAndCreateOrder(page: Page) {
  await page.getByTestId('tab-card').click();
  await page.getByPlaceholder('seu@email.com').fill('sandbox.cartao@cardapiobemcomer.com.br');
  await page.getByPlaceholder('000.000.000-00').fill('09299641447');
  await page.getByTestId('pay-button').click();
  await page.getByRole('heading', { name: /pagamento com cartão/i }).waitFor();
  await page.waitForFunction(() => Boolean((window as any).PagSeguro));
}

async function selectDebitCardAndCreateOrder(page: Page) {
  await page.getByTestId('tab-debit-card').click();
  await page.getByPlaceholder('seu@email.com').fill('sandbox.debito@cardapiobemcomer.com.br');
  await page.getByPlaceholder('000.000.000-00').fill('09299641447');
  await page.getByTestId('pay-button').click();
  await page.getByRole('heading', { name: /pagamento no débito/i }).waitFor();
  await page.waitForFunction(() => Boolean((window as any).PagSeguro));
}

async function mockPagBankCardEncryptionError(page: Page, code: string) {
  await page.evaluate((errorCode) => {
    const pagSeguro = (window as any).PagSeguro;
    if (!pagSeguro) throw new Error('PagSeguro SDK is not loaded');

    pagSeguro.encryptCard = () => ({
      hasErrors: true,
      errors: [{ code: errorCode, message: `SDK ${errorCode}` }],
    });
  }, code);
}

async function mockPagBankSuccessful3ds(page: Page) {
  await page.evaluate(() => {
    const pagSeguro = (window as any).PagSeguro;
    if (!pagSeguro) throw new Error('PagSeguro SDK is not loaded');

    (window as any).__pagbank3dsAmount = null;
    pagSeguro.encryptCard = () => ({
      hasErrors: false,
      encryptedCard: 'encrypted-card-for-total-test',
    });
    pagSeguro.setUp = () => undefined;
    pagSeguro.authenticate3DS = async (request: any) => {
      (window as any).__pagbank3dsAmount = request?.data?.amount?.value;
      return {
        status: 'AUTH_FLOW_COMPLETED',
        id: '3DS_TOTAL_TEST',
      };
    };
  });
}

async function fillCreditCardForm(
  page: Page,
  card: { number: string; month: string; year: string; cvv: string; holder: string },
) {
  await page.getByPlaceholder('0000 0000 0000 0000').fill(card.number);
  await page.getByPlaceholder('MM').fill(card.month);
  await page.getByPlaceholder('AAAA').fill(card.year);
  await page.getByPlaceholder('123').first().fill(card.cvv);
  await page.getByPlaceholder('Nome como está no cartão').fill(card.holder);
}

async function fillDebitCardForm(
  page: Page,
  card: { number: string; month: string; year: string; cvv: string; holder: string },
) {
  await fillCreditCardForm(page, card);
  await page.getByPlaceholder('00000-000').fill('01311300');
  await page.getByPlaceholder('Rua').fill('Av. Paulista');
  await page.getByPlaceholder('123').nth(1).fill('2073');
  await page.getByPlaceholder('Apto, casa').fill('Apto 100');
  await page.getByPlaceholder('Cidade').fill('Sao Paulo');
  await page.getByPlaceholder('SP').fill('SP');
}

async function expectPaidOrderPage(page: Page, customerName: string, productName: string) {
  await expect(page.getByRole('heading', { name: /Pedido #/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Pago$/i })).toBeVisible();
  await expect(page.getByText(customerName)).toBeVisible();
  await expect(page.getByText(productName)).toBeVisible();
  await expect(page.getByText('Itens do Pedido')).toBeVisible();
  await expect(page.getByText('Total')).toBeVisible();
}

async function writeEvidence(testInfo: { title: string }, data: unknown) {
  const filename = `${slug(testInfo.title)}.json`;
  const payload = {
    ...(data && typeof data === 'object' && !Array.isArray(data) ? data : { data }),
    backendPagBankExchanges: await readBackendPagBankEvidence(),
  };
  await fs.writeFile(path.join(evidenceDir, filename), JSON.stringify(payload, null, 2));
}

async function expectBackendPagBankEvidence(expected: {
  service: 'orders-api' | 'sdk-api' | 'qrcode-api';
  path?: string;
  pathIncludes?: string;
  referenceId?: string;
  expectedPaymentType?: 'CREDIT_CARD' | 'DEBIT_CARD';
  expectedChargeStatus?: 'PAID' | 'DECLINED';
  expectedThreeDsStatus?: 'AUTHENTICATED' | 'NOT_AUTHENTICATED';
}) {
  await expect
    .poll(async () => {
      const exchanges = await readBackendPagBankEvidence();
      return exchanges.some((exchange) => {
        if (exchange.service !== expected.service) return false;
        if (expected.path && exchange.path !== expected.path) return false;
        if (expected.pathIncludes && !String(exchange.path).includes(expected.pathIncludes)) return false;

        const serialized = JSON.stringify(exchange);
        if (expected.referenceId && !serialized.includes(expected.referenceId)) return false;
        if (expected.expectedPaymentType && !serialized.includes(expected.expectedPaymentType)) return false;
        if (expected.expectedChargeStatus && !serialized.includes(`"status":"${expected.expectedChargeStatus}"`)) return false;
        if (expected.expectedThreeDsStatus && !serialized.includes(expected.expectedThreeDsStatus)) return false;
        if (serialized.includes('Bearer ')) return false;
        if (containsRawEmail(serialized)) return false;

        return true;
      });
    })
    .toBe(true);
}

async function readBackendPagBankEvidence() {
  const content = await fs.readFile(backendEvidenceFile, 'utf8').catch(() => '');
  return content
    .split('\n')
    .filter(Boolean)
    .map((line) => parseJson(line) as Record<string, unknown>);
}

async function loginAsAdmin() {
  const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: e2eAdminEmail, password: e2eAdminPassword }),
  });
  const body = await response.json().catch(() => null);
  expect(response.ok, `Admin login failed: ${JSON.stringify(body)}`).toBe(true);
  return String(body.accessToken);
}

async function adminApi<T = unknown>(pathname: string, init: RequestInit = {}) {
  if (!adminToken) throw new Error('Admin token was not initialized');

  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  expect(response.ok, `Admin API ${pathname} failed: ${JSON.stringify(body)}`).toBe(true);
  return body as T;
}

async function createThreeDsHomologationProducts() {
  const category = await adminApi<{ id: string }>('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: `Homologacao 3DS ${Date.now()}`,
      description: 'Produtos temporarios para matriz sandbox 3DS PagBank',
      sortOrder: 9999,
    }),
  });
  homologationCategoryId = category.id;

  const uniqueAmounts = Array.from(
    new Set([...threeDsMatrix.map((scenario) => scenario.amountCents), transientTokenRegressionAmountCents]),
  ).sort((a, b) => a - b);
  for (const amountCents of uniqueAmounts) {
    const name =
      amountCents === transientTokenRegressionAmountCents
        ? `Regressao transientToken ${amountCents}`
        : `Teste 3DS ${amountCents}`;
    const product = await adminApi<{ id: string; name?: string }>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: category.id,
        name,
        description: `Produto temporario para teste 3DS PagBank no valor ${amountCents}`,
        price: amountCents / 100,
        isCompound: false,
      }),
    });
    homologationProductsByAmount.set(amountCents, { id: product.id, name });
  }
}

async function cleanupThreeDsHomologationProducts() {
  if (!adminToken) return;

  for (const product of homologationProductsByAmount.values()) {
    await adminApi(`/api/admin/products/${product.id}`, { method: 'DELETE' }).catch(() => undefined);
  }
  homologationProductsByAmount.clear();

  if (homologationCategoryId) {
    await adminApi(`/api/admin/categories/${homologationCategoryId}`, { method: 'DELETE' }).catch(() => undefined);
    homologationCategoryId = null;
  }
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function safeResponseText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function postMockedPagBankWebhook(payload: Record<string, unknown>) {
  const rawBody = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const webhookToken = await getPagBankWebhookToken();

  if (webhookToken) {
    headers['x-authenticity-token'] = createHash('sha256')
      .update(`${webhookToken}-${rawBody}`)
      .digest('hex');
  }

  return fetch(`${apiBaseUrl}/api/webhooks/pagbank`, {
    method: 'POST',
    headers,
    body: rawBody,
  });
}

let cachedPagBankWebhookToken: string | null | undefined;

async function getPagBankWebhookToken() {
  if (cachedPagBankWebhookToken !== undefined) return cachedPagBankWebhookToken ?? '';
  if (process.env.PAGBANK_WEBHOOK_TOKEN) {
    cachedPagBankWebhookToken = process.env.PAGBANK_WEBHOOK_TOKEN;
    return cachedPagBankWebhookToken;
  }

  for (const envPath of [path.join(process.cwd(), '.env'), path.join(process.cwd(), 'apps/api/.env')]) {
    try {
      const content = await fs.readFile(envPath, 'utf8');
      const token = readEnvValue(content, 'PAGBANK_WEBHOOK_TOKEN');
      if (token) {
        cachedPagBankWebhookToken = token;
        return token;
      }
    } catch {
      // Local test runs may not have all env files present.
    }
  }

  cachedPagBankWebhookToken = null;
  return '';
}

function readEnvValue(content: string, key: string) {
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));
  if (!line) return '';

  return line
    .slice(key.length + 1)
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      const normalizedKey = key.toLowerCase();

      if (key === 'encryptedCard' && typeof entry === 'string') {
        return [key, `<encrypted-card:${entry.length}:prefix:${entry.slice(0, 16)}>`];
      }
      if (normalizedKey.includes('taxid') || normalizedKey.includes('identificationnumber')) {
        return [key, maskDigits(String(entry ?? ''))];
      }
      if (normalizedKey.includes('email') && typeof entry === 'string') {
        return [key, maskEmail(entry)];
      }
      if (normalizedKey.includes('phone') && typeof entry === 'string') {
        return [key, maskDigits(entry)];
      }
      if (normalizedKey === 'number' && typeof entry === 'string' && /^\d{8,13}$/.test(entry)) {
        return [key, maskDigits(entry)];
      }
      if (key === 'qrCode' && typeof entry === 'string') {
        return [key, `<pix-copy-paste:${entry.length}:prefix:${entry.slice(0, 20)}>`];
      }
      if (key === 'qrCodeBase64' && typeof entry === 'string') {
        return [key, `<base64-qrcode:${entry.length}>`];
      }
      if (key === 'customerToken' && typeof entry === 'string') {
        return [key, '<redacted-customer-token>'];
      }
      if (key === 'session' && typeof entry === 'string') {
        return [key, `<pagbank-3ds-session:${entry.length}>`];
      }
      if (key === 'authenticationId' && typeof entry === 'string') {
        return [key, `<pagbank-3ds-auth:${entry.slice(0, 8)}...>`];
      }
      return [key, sanitize(entry)];
    }),
  );
}

function maskDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return '<redacted-digits>';
  return `${digits.slice(0, 3)}${'*'.repeat(Math.max(0, digits.length - 5))}${digits.slice(-2)}`;
}

function maskEmail(value: string) {
  const [name, domain] = value.split('@');
  if (!name || !domain) return '<redacted-email>';
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(3, name.length - visible.length))}@${domain}`;
}

function containsRawEmail(value: string) {
  return /[A-Za-z0-9._%+-]{3,}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(value);
}
