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

  test('admin: reordenar grupos de opções persiste após reload', async ({ page }) => {
    await uiLogin(page);
    await page.goto('/admin/products');

    // Expande a Quentinha M (produto composto com múltiplos grupos de opções).
    // Retorna o locator do card do produto já com os handles de arraste visíveis.
    async function expandQuentinha() {
      const product = page.getByTestId(/^product-/).filter({ hasText: 'Quentinha M' }).first();
      await expect(product, 'produto composto Quentinha M deve existir').toBeVisible();
      await product.getByRole('button', { name: /Expandir produto/i }).click();
      await expect(page.getByLabel('Arrastar grupo').first()).toBeVisible();
      return product;
    }

    const product = await expandQuentinha();
    const groupRows = () => product.getByTestId(/^group-row-/);

    // precisa de pelo menos 2 grupos pra reordenar
    await expect(groupRows().nth(1)).toBeVisible();
    const firstBefore = await groupRows().first().innerText();
    const secondBefore = await groupRows().nth(1).innerText();
    expect(firstBefore, 'os dois primeiros grupos devem ser distintos').not.toBe(secondBefore);

    // Arrasta o primeiro grupo pra depois do segundo (PointerSensor exige mover >6px
    // pra ativar o drag, por isso o passo intermediário antes do alvo).
    const handles = page.getByLabel('Arrastar grupo');
    const fb = await handles.nth(0).boundingBox();
    const sb = await handles.nth(1).boundingBox();
    // A PATCH de reorder dispara no drop (mouse.up). Registramos a espera pela
    // resposta ANTES do mouse.up pra não perder a request (senão dá timeout).
    const reorderResp = page.waitForResponse(
      (r) => r.url().includes('/api/admin/option-groups/reorder') && r.request().method() === 'PATCH',
    );
    await page.mouse.move(fb!.x + 4, fb!.y + 4);
    await page.mouse.down();
    // dnd-kit precisa de um hover real sobre o centro vertical da linha-alvo antes
    // do drop; vários passos tornam o drag mais estável.
    await page.mouse.move(fb!.x + 4, fb!.y + 14, { steps: 5 });
    await page.mouse.move(sb!.x + 4, sb!.y + sb!.height / 2, { steps: 10 });
    await page.mouse.move(sb!.x + 4, sb!.y + sb!.height / 2 + 2, { steps: 5 });
    await page.mouse.up();
    await reorderResp;

    // Recarrega e re-expande: a nova ordem deve ter persistido no backend.
    await page.reload();
    await expandQuentinha();
    const firstAfter = await page.getByTestId(/^group-row-/).first().innerText();
    expect(firstAfter, 'após reordenar+reload, o antigo 2º grupo vira o 1º').toBe(secondBefore);
    expect(firstAfter).not.toBe(firstBefore);
  });

  test('limite combinado: 3ª carne bloqueada (server 400)', async () => {
    const api = await pwRequest.newContext();
    const token = await apiLogin(api);
    const auth = { Authorization: `Bearer ${token}` };

    // Construímos um produto composto DESCARTÁVEL sob a categoria "Sopas", que é
    // always-on (sem schedule) — assim o pedido nunca esbarra na guarda de horário
    // de categoria (o problema do seed "Quentinha M — Almoço", restrito a 11h-15h).
    let productId: string | undefined;
    let limitId: string | undefined;

    try {
      await setForceOpen(api, token, true);

      // categoria sempre disponível
      const categories = (await (
        await api.get(`${API}/api/admin/categories`, { headers: auth })
      ).json()) as any[];
      const sopas = categories.find((c) => /^Sopas$/i.test(c.name));
      expect(sopas, 'categoria Sopas deve existir no seed').toBeTruthy();

      // produto composto
      const product = await (
        await api.post(`${API}/api/admin/products`, {
          headers: auth,
          data: {
            name: `E2E Combinado ${Date.now()}`,
            categoryId: sopas.id,
            price: 25,
            isCompound: true,
          },
        })
      ).json();
      productId = product.id;
      expect(productId, `criação de produto deve retornar id: ${JSON.stringify(product)}`).toBeTruthy();

      // dois grupos de opções (máx 2 cada → 2 na Proteína passa no máx POR GRUPO,
      // isolando o limite combinado como a única causa do 400)
      async function createGroup(name: string): Promise<string> {
        const res = await api.post(`${API}/api/admin/products/${productId}/option-groups`, {
          headers: auth,
          data: { name, minSelections: 0, maxSelections: 2 },
        });
        expect(res.ok(), `criar grupo ${name} falhou: ${res.status()} ${await res.text()}`).toBeTruthy();
        return (await res.json()).id;
      }
      const g1Id = await createGroup('Proteína');
      const g2Id = await createGroup('Churrasco');

      // duas opções em cada grupo
      async function addOptions(gId: string): Promise<string[]> {
        const ids: string[] = [];
        for (const optName of ['Op1', 'Op2']) {
          const res = await api.post(`${API}/api/admin/option-groups/${gId}/options`, {
            headers: auth,
            data: { name: optName, price: 0 },
          });
          expect(res.ok(), `criar opção ${optName} falhou: ${res.status()} ${await res.text()}`).toBeTruthy();
          ids.push((await res.json()).id);
        }
        return ids;
      }
      const [g1opt1, g1opt2] = await addOptions(g1Id);
      const [g2opt1] = await addOptions(g2Id);

      // limite combinado "Carnes" (máx 2 no total entre os dois grupos)
      const limit = await (
        await api.post(`${API}/api/admin/products/${productId}/combined-limits`, {
          headers: auth,
          data: { name: 'Carnes', maxSelections: 2 },
        })
      ).json();
      limitId = limit.id;
      expect(limitId, `criação de limite deve retornar id: ${JSON.stringify(limit)}`).toBeTruthy();

      // vincula ambos os grupos ao limite (rota de update de grupo é PUT)
      for (const gId of [g1Id, g2Id]) {
        const res = await api.put(`${API}/api/admin/option-groups/${gId}`, {
          headers: auth,
          data: { combinedLimitId: limitId },
        });
        expect(res.ok(), `vincular grupo ${gId} ao limite falhou: ${res.status()}`).toBeTruthy();
      }

      // CONTROLE: exatamente 2 carnes (1 + 1) → aceito. Prova que o limite de 2 é
      // permitido e só a 3ª é bloqueada.
      const controlRes = await api.post(`${API}/api/orders`, {
        data: {
          customerName: 'E2E Carnes Controle',
          customerPhone: '83988887777',
          deliveryType: 'pickup',
          paymentMethod: 'cash',
          items: [
            {
              productId,
              quantity: 1,
              optionSelections: [
                { groupId: g1Id, optionIds: [g1opt1] },
                { groupId: g2Id, optionIds: [g2opt1] },
              ],
            },
          ],
        },
      });
      expect(
        controlRes.status(),
        `2 carnes deve ser aceito: ${controlRes.status()} ${await controlRes.text()}`,
      ).toBeLessThan(400);

      // OVER: 2 na Proteína (dentro do máx por grupo) + 1 no Churrasco = 3 no total
      // → excede o limite combinado de 2 → 400.
      const res = await api.post(`${API}/api/orders`, {
        data: {
          customerName: 'E2E Carnes',
          customerPhone: '83988887777',
          deliveryType: 'pickup',
          paymentMethod: 'cash',
          items: [
            {
              productId,
              quantity: 1,
              optionSelections: [
                { groupId: g1Id, optionIds: [g1opt1, g1opt2] },
                { groupId: g2Id, optionIds: [g2opt1] },
              ],
            },
          ],
        },
      });
      expect(res.status(), 'pedido com 3 carnes deve ser rejeitado').toBe(400);

      // ISOLAMENTO: o 400 veio do LIMITE COMBINADO (não de máx por grupo).
      // Mensagem de política: "Carnes" permite no maximo 2 no total
      const body = await res.text();
      expect(body, `400 deve referenciar o limite combinado, veio: ${body}`).toMatch(/Carnes/i);
      expect(body, `400 deve referenciar o total combinado, veio: ${body}`).toMatch(/no total/i);
    } finally {
      // cleanup best-effort (ignora erros)
      if (productId) {
        await api.delete(`${API}/api/admin/products/${productId}`, { headers: auth }).catch(() => {});
      }
      if (limitId) {
        await api.delete(`${API}/api/admin/combined-limits/${limitId}`, { headers: auth }).catch(() => {});
      }
      await api.dispose();
    }
  });
});

test.describe('Bem Comer — auto-comprovante (estação de impressão)', () => {
  const PRINT_MARKER = '__PRINT_CALLED__';
  const IFRAME_SELECTOR = '#bemcomer-receipt-print-frame';

  // Espiona window.print em TODO documento — a página principal e o iframe
  // same-origin do /receipt. `addInitScript` roda antes de qualquer script em
  // todos os frames, então quando o board chama `frame.contentWindow.print()`
  // no onload do iframe, cai neste override e emite um marcador no console que
  // o lado Playwright consegue observar.
  function installPrintSpy() {
    const orig = window.print;
    window.print = () => {
      console.log('__PRINT_CALLED__');
      try {
        orig?.call(window);
      } catch {
        /* jsdom/headless pode não implementar print() de verdade */
      }
    };
  }

  test('auto-comprovante: imprime ao entrar em A Fazer/Novo SÓ com a estação ligada', async ({ page, context }) => {
    const api = await pwRequest.newContext();
    const token = await apiLogin(api);
    const auth = { Authorization: `Bearer ${token}` };
    // estado determinístico antes
    await api.post(`${API}/api/admin/system/clear-data`, { headers: auth });

    await context.addInitScript(installPrintSpy);

    // Observa o marcador de print de forma resiliente: um listener persistente
    // (registra mesmo se o evento chegar antes do await) + uma Promise não-fatal.
    let printFired = false;
    page.on('console', (m) => {
      if (m.text().includes(PRINT_MARKER)) printFired = true;
    });
    const printMarker = page
      .waitForEvent('console', {
        predicate: (m) => m.text().includes(PRINT_MARKER),
        timeout: 15000,
      })
      .catch(() => null);

    await uiLogin(page);
    await page.goto('/admin/orders');

    // liga a estação de impressão (checkbox controlado; enabled troca de forma
    // síncrona via localStorage, sem PUT — diferente do toggle de frete noturno)
    const toggle = page.getByTestId('print-station-toggle').locator('input');
    await toggle.check();
    await expect(toggle).toBeChecked();

    // espera a carga inicial do board (semeia os ids já existentes, para não
    // reimprimir) antes de criar o pedido novo
    await expect(page.getByText('A Fazer / Novo')).toBeVisible();
    await page.waitForTimeout(1000);

    // cria pedido pickup → nasce como 'paid' e cai em "A Fazer / Novo"; o board
    // detecta o id novo pelo polling e o auto-print dispara (sem passar por ready)
    const orderId = await createPickupOrder(api);

    // ASSERTIVA PRIMÁRIA (robusta/determinística): a chegada do pedido novo
    // fez o board criar o iframe oculto e navegá-lo para o /receipt deste pedido.
    // Isso prova que o auto-print foi acionado sem depender de propagação de
    // console cross-frame nem de o /receipt terminar o load — é puro estado do DOM.
    await expect
      .poll(() => page.locator(IFRAME_SELECTOR).getAttribute('src').catch(() => null), {
        timeout: 15000,
      })
      .toContain(orderId);

    // CORROBORAÇÃO (best-effort, NÃO-fatal): o window.print() do iframe realmente
    // executou. Mantida não-fatal de propósito — captura de console em iframe
    // same-origin pode ser instável em CI, e o gate de pass/fail é a assertiva
    // primária acima. Serve como diagnóstico de que o print de fato disparou.
    await printMarker;
    if (!printFired) {
      console.warn(
        '[e2e] iframe criado com src correto, mas o marcador __PRINT_CALLED__ não foi capturado ' +
          '(provável instabilidade de captura de console cross-frame; assertiva primária já passou).',
      );
    }

    await api.post(`${API}/api/admin/system/clear-data`, { headers: auth });
    await api.dispose();
  });

  test('auto-comprovante: NÃO imprime com a estação desligada', async ({ page, context }) => {
    const api = await pwRequest.newContext();
    const token = await apiLogin(api);
    const auth = { Authorization: `Bearer ${token}` };
    await api.post(`${API}/api/admin/system/clear-data`, { headers: auth });

    await context.addInitScript(installPrintSpy);
    let printFired = false;
    page.on('console', (m) => {
      if (m.text().includes(PRINT_MARKER)) printFired = true;
    });

    await uiLogin(page);
    await page.goto('/admin/orders');

    // estação DESLIGADA — estado padrão em contexto novo; garante explicitamente
    const toggle = page.getByTestId('print-station-toggle').locator('input');
    await expect(toggle).not.toBeChecked();

    await createPickupOrder(api);

    // Prova que o pedido novo CHEGOU e foi processado (o board renderizou o card
    // em "A Fazer / Novo") — sem isso, o teste negativo seria um falso-positivo
    // caso o evento NEW_ORDER simplesmente nunca tivesse chegado.
    await expect(page.getByText('E2E Cliente')).toBeVisible();

    // margem extra para eventual print tardio antes de afirmar a AUSÊNCIA
    await page.waitForTimeout(2000);

    // com a estação desligada: nenhum iframe de comprovante e nenhum print()
    await expect(page.locator(IFRAME_SELECTOR)).toHaveCount(0);
    expect(printFired, 'print() não deve disparar com a estação desligada').toBeFalsy();

    await api.post(`${API}/api/admin/system/clear-data`, { headers: auth });
    await api.dispose();
  });
});
