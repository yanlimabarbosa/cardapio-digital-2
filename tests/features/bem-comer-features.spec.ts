import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';
import { execSync } from 'node:child_process';

const PG_CONTAINER = 'cardapio-digital-2-postgres-1';
function psql(sql: string): string {
  return execSync(
    `docker exec ${PG_CONTAINER} psql -U postgres -d cardapio_digital_2 -tAc ${JSON.stringify(sql)}`,
    { encoding: 'utf8' },
  ).trim();
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3334';
const ADMIN_EMAIL = 'admin@bemcomer.com';
const ADMIN_PASSWORD = 'BemComer@2026#Painel47';

async function apiLogin(api: APIRequestContext): Promise<string> {
  const res = await api.post(`${API}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `login failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  return body.accessToken ?? body.token ?? body.access_token;
}

async function setForceOpen(api: APIRequestContext, token: string, open: boolean) {
  await api.put(`${API}/api/admin/store-settings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { forceOpen: open },
  });
}

// Almoço/Jantar categories are time-restricted (11h-15h / 18h-21h); these are
// always available, so an order for them never trips the category-schedule guard.
const ALWAYS_ON_CATEGORIES = ['Sopas', 'Porções', 'Bebidas', 'Sobremesas'];

async function firstProductId(api: APIRequestContext): Promise<string> {
  const token = await apiLogin(api);
  const res = await api.get(`${API}/api/admin/products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const products = (await res.json()) as any[];
  const product = products.find(
    (p) =>
      p.isActive &&
      !p.isCompound &&
      (p.optionGroups?.length ?? 0) === 0 &&
      ALWAYS_ON_CATEGORIES.includes(p.categoryName),
  );
  if (!product) throw new Error('no always-on simple product found for test setup');
  return product.id;
}

async function createPickupOrder(api: APIRequestContext): Promise<string> {
  const token = await apiLogin(api);
  await setForceOpen(api, token, true);
  const productId = await firstProductId(api);
  const res = await api.post(`${API}/api/orders`, {
    data: {
      customerName: 'E2E Cliente',
      customerPhone: '83988887777',
      deliveryType: 'pickup',
      paymentMethod: 'cash',
      items: [{ productId, quantity: 1 }],
    },
  });
  expect(res.ok(), `order create failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  return (await res.json()).id;
}

async function setOrderStatus(api: APIRequestContext, token: string, orderId: string, status: string) {
  const res = await api.patch(`${API}/api/orders/${orderId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status },
  });
  expect(res.ok(), `status change to ${status} failed: ${res.status()}`).toBeTruthy();
}

async function uiLogin(page) {
  await page.goto('/admin/login');
  await page.getByTestId('admin-email').fill(ADMIN_EMAIL);
  await page.getByTestId('admin-password').fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST'),
    page.getByTestId('admin-login').click(),
  ]);
  await page.waitForURL(/\/admin(\/|$)/);
}

test.describe('Bem Comer — features corrigidas', () => {
  const nightCheckbox = (page) =>
    page.locator('label', { hasText: 'Ativar entrega grátis à noite' }).locator('input[type="checkbox"]');

  // Controlled checkbox that persists async: a plain check()/uncheck() races the
  // React re-render (state only flips after the PUT + refetch resolves). So click
  // to fire onChange, wait for the PUT, then poll the resulting checked state.
  async function setNight(page, on: boolean) {
    const cb = nightCheckbox(page);
    if ((await cb.isChecked()) === on) return;
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/admin/store-settings') && r.request().method() === 'PUT',
      ),
      cb.click(),
    ]);
    if (on) await expect(cb).toBeChecked();
    else await expect(cb).not.toBeChecked();
  }

  test('frete grátis noturno: toggle marca, mostra horários e PERSISTE após reload', async ({ page }) => {
    await uiLogin(page);
    await page.goto('/admin/settings');

    // normaliza pra desligado (independe de runs anteriores)
    await setNight(page, false);
    await expect(nightCheckbox(page)).not.toBeChecked();

    // liga (auto-save) → marca + mostra horários
    await setNight(page, true);
    await expect(nightCheckbox(page)).toBeChecked();
    await expect(page.getByText('Início (HH:MM)')).toBeVisible();
    await expect(page.getByText('Fim (HH:MM)')).toBeVisible();

    // recarrega — continua marcado (PROVA de persistência no backend)
    await page.reload();
    await expect(nightCheckbox(page)).toBeChecked();

    // cleanup: desliga
    await setNight(page, false);
  });

  test('motoboy: aba na sidebar + cadastro funciona (sem erro 400)', async ({ page }) => {
    const name = `Motoboy E2E ${Date.now()}`;
    await uiLogin(page);

    // aba na sidebar
    await expect(page.getByRole('link', { name: 'Motoboys' })).toBeVisible();
    await page.getByRole('link', { name: 'Motoboys' }).click();
    await page.waitForURL(/\/admin\/drivers/);

    // cadastrar (front manda só name+phone+calculatesFee, SEM isActive — o fix)
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await page.getByPlaceholder('Nome do motoboy').fill(name);
    await page.getByPlaceholder('(XX) XXXXX-XXXX').fill('83999990000');

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/admin/drivers') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Salvar' }).click(),
    ]);
    expect(res.status(), 'cadastro de motoboy deve retornar 2xx (não 400)').toBeLessThan(300);

    // aparece na lista
    await expect(page.getByText(name)).toBeVisible();

    // cleanup via API (evita flakiness do confirm())
    const api = await pwRequest.newContext();
    const token = await apiLogin(api);
    const list = await (await api.get(`${API}/api/admin/drivers`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const created = (list as any[]).find((d) => d.name === name);
    if (created) {
      await api.delete(`${API}/api/admin/drivers/${created.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    await api.dispose();
  });

  test('cliente: tela do pedido mostra "paga no balcão", não "Pago"', async ({ page }) => {
    const api = await pwRequest.newContext();
    const orderId = await createPickupOrder(api);

    await page.goto(`/order/${orderId}`);

    // mensagem de pagamento na entrega/retirada
    await expect(page.getByText(/Você paga no balcão/i)).toBeVisible();
    // status NÃO deve aparecer como "Pago"
    await expect(page.getByText('Pago', { exact: true })).toHaveCount(0);

    await api.dispose();
  });

  test('kanban: botão "Voltar etapa" retrocede o pedido', async ({ page }) => {
    const api = await pwRequest.newContext();
    const token = await apiLogin(api);
    // estado determinístico: zera pedidos, cria 1 e coloca em "preparing"
    await api.post(`${API}/api/admin/system/clear-data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orderId = await createPickupOrder(api);
    await setOrderStatus(api, token, orderId, 'preparing');

    await uiLogin(page);
    await page.goto('/admin/orders');

    const backBtn = page.getByRole('button', { name: /Voltar etapa/i });
    await expect(backBtn).toHaveCount(1);

    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/orders\/[0-9a-f-]+\/status/.test(r.url()) && r.request().method() === 'PATCH',
      ),
      backBtn.click(),
    ]);
    expect(res.status(), 'voltar etapa deve retornar 200 (backend aceita transição reversa)').toBe(200);

    // confirma no backend que voltou pra 'paid'
    const after = await (await api.get(`${API}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    expect(after.status).toBe('paid');

    await api.dispose();
  });

  test('kanban: pedido de ENTREGA pronto → seleciona motoboy e despacha (pedido do Raphael)', async ({ page }) => {
    const api = await pwRequest.newContext();
    const token = await apiLogin(api);

    // estado limpo + motoboy ativo
    await api.post(`${API}/api/admin/system/clear-data`, { headers: { Authorization: `Bearer ${token}` } });
    const driverName = `Motoboy Kanban ${Date.now()}`;
    const drv = await (await api.post(`${API}/api/admin/drivers`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: driverName, phone: '83911112222', calculatesFee: true },
    })).json();

    // pedido de entrega já em 'ready' (insere direto pra evitar dependência do ViaCEP)
    const orderId = psql(
      `with c as (insert into customers (name, phone) values ('E2E Deliv','83977776666') returning id) ` +
        `insert into orders (customer_id, customer_name, total_amount, payment_method, order_number, status, delivery_type, delivery_fee, delivery_address, created_at, updated_at) ` +
        `select c.id, 'E2E Deliv', 25.00, 'cash', 9999, 'ready', 'delivery', 5.00, ` +
        `'{"cep":"58000000","street":"R","number":"1","neighborhood":"Centro","city":"JP","state":"PB"}'::jsonb, now(), now() from c returning id;`,
    ).split('\n')[0].trim();

    await uiLogin(page);
    await page.goto('/admin/orders');

    // dropdown de motoboy aparece no card entrega+pronto, com o motoboy cadastrado
    const select = page.locator('select').filter({ hasText: 'Selecione o motoboy' }).first();
    await expect(select).toBeVisible();
    await expect(select.locator('option', { hasText: driverName })).toHaveCount(1);

    // seleciona o motoboy e despacha
    await select.selectOption({ label: driverName });
    const [assignRes] = await Promise.all([
      page.waitForResponse(
        (r) => /\/api\/admin\/orders\/[0-9a-f-]+\/driver/.test(r.url()) && r.request().method() === 'PATCH',
      ),
      page.getByRole('button', { name: /Despachar/i }).click(),
    ]);
    expect(assignRes.status(), 'atribuir motoboy deve retornar 200').toBe(200);

    // confirma no banco: motoboy atribuído + pedido foi pra 'out_for_delivery'
    await expect
      .poll(() => psql(`select status||'|'||coalesce(driver_name,'NULL') from orders where id='${orderId}';`))
      .toBe(`out_for_delivery|${driverName}`);

    // cleanup
    await api.post(`${API}/api/admin/system/clear-data`, { headers: { Authorization: `Bearer ${token}` } });
    await api.delete(`${API}/api/admin/drivers/${drv.id}`, { headers: { Authorization: `Bearer ${token}` } });
    await api.dispose();
  });
});
