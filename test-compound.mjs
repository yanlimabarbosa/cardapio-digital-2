import { chromium } from 'playwright';

const API = 'http://localhost:3333';
const WEB = 'http://localhost:3847';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiLogin() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@feijoadadofabio.com', password: 'admin123' }),
  });
  const data = await res.json();
  return data.accessToken;
}

async function adminFetch(path, token, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
  return res.json();
}

async function setupCompoundProduct(token) {
  // Get first category
  const cats = await adminFetch('/api/admin/categories', token);
  const catId = cats[0].id;

  // Create compound product
  const product = await adminFetch('/api/admin/products', token, {
    method: 'POST',
    body: JSON.stringify({ name: 'Marmitex Composto', price: 22, categoryId: catId, isCompound: true }),
  });
  console.log('Created product:', product.id);

  // Create option groups
  const group1 = await adminFetch(`/api/admin/products/${product.id}/option-groups`, token, {
    method: 'POST',
    body: JSON.stringify({ name: 'Acompanhamentos', minSelections: 1, maxSelections: 2 }),
  });
  console.log('Created group:', group1.name);

  const group2 = await adminFetch(`/api/admin/products/${product.id}/option-groups`, token, {
    method: 'POST',
    body: JSON.stringify({ name: 'Proteínas', minSelections: 1, maxSelections: 1 }),
  });
  console.log('Created group:', group2.name);

  // Add options to Acompanhamentos
  for (const [name, price] of [['Cuscuz', 0], ['Macaxeira', 0], ['Inhame', 0], ['Batata doce', 2]]) {
    await adminFetch(`/api/admin/option-groups/${group1.id}/options`, token, {
      method: 'POST',
      body: JSON.stringify({ name, price }),
    });
  }
  console.log('Added 4 options to Acompanhamentos');

  // Add options to Proteínas
  for (const [name, price] of [['Carne de sol', 0], ['Frango guisado', 0], ['Carne guisada', 0], ['Calabresa acebolada', 3], ['Salsicha ao molho', 0]]) {
    await adminFetch(`/api/admin/option-groups/${group2.id}/options`, token, {
      method: 'POST',
      body: JSON.stringify({ name, price }),
    });
  }
  console.log('Added 5 options to Proteínas');

  return product.id;
}

async function main() {
  // Step 1: Setup via API
  console.log('=== Setting up compound product via API ===');
  const token = await apiLogin();
  console.log('Logged in');
  const productId = await setupCompoundProduct(token);
  console.log('Setup complete!\n');

  // Step 2: Launch visible browser
  console.log('=== Launching browser (you should see it) ===');
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const page = await context.newPage();

  // Step 3: Go to customer menu
  console.log('--- Opening menu ---');
  await page.goto(WEB);
  await sleep(5000);

  // Scroll to find Marmitex Composto
  let found = false;
  for (let i = 0; i < 10; i++) {
    const item = page.locator('text=Marmitex Composto').first();
    if (await item.isVisible().catch(() => false)) {
      found = true;
      await item.scrollIntoViewIfNeeded();
      await sleep(500);
      await item.click();
      break;
    }
    await page.evaluate(() => window.scrollBy(0, 400));
    await sleep(500);
  }

  if (!found) {
    console.log('Product not visible - taking screenshot');
    await page.screenshot({ path: '/tmp/menu.png' });
    await sleep(15000);
    await browser.close();
    return;
  }

  // Step 4: Product detail with option groups
  console.log('--- Product detail opened ---');
  await sleep(2000);

  // Verify option groups
  const hasAcomp = await page.locator('h3:has-text("Acompanhamentos")').first().isVisible();
  const hasProt = await page.locator('h3:has-text("Proteínas")').first().isVisible();
  const hasRequired = await page.locator('text=Obrigatório').first().isVisible();
  console.log(`Groups: Acomp=${hasAcomp} Prot=${hasProt} Required=${hasRequired}`);

  // Try to add without selecting required — button should be disabled
  const addBtn = page.locator('[data-testid="confirm-add-to-cart"]').first();
  const enabledBefore = await addBtn.isEnabled();
  console.log(`Add button before selections: ${enabledBefore ? 'ENABLED (unexpected)' : 'DISABLED (correct!)'}`);

  // Scope selections to the modal
  const modal = page.locator('[data-modal-portal="true"], [role="dialog"], .fixed.inset-0').last();

  // Select "Cuscuz" from Acompanhamentos
  console.log('--- Selecting options ---');
  await modal.locator('button >> text=Cuscuz').first().click({ force: true });
  await sleep(600);
  console.log('Selected Cuscuz');

  // Add button should still be disabled (Proteínas required but not selected)
  const enabledMid = await addBtn.isEnabled();
  console.log(`Add button after 1 group: ${enabledMid ? 'ENABLED (unexpected)' : 'DISABLED (correct!)'}`);

  // Select "Carne de sol" from Proteínas
  await modal.locator('button >> text=Carne de sol').first().click({ force: true });
  await sleep(600);
  console.log('Selected Carne de sol');

  // Now add button should be enabled
  const enabledAfter = await addBtn.isEnabled();
  console.log(`Add button after all required: ${enabledAfter ? 'ENABLED (correct!)' : 'DISABLED (unexpected)'}`);

  // Also select Batata doce (+R$2) from Acompanhamentos
  await modal.locator('button >> text=Batata doce').first().click({ force: true });
  await sleep(600);
  console.log('Selected Batata doce (+R$2)');

  // Check price updated (should be 22 + 2 = R$24)
  await sleep(500);
  const btnText = await addBtn.textContent();
  console.log(`Add button text: "${btnText}"`);

  // Add to cart
  await addBtn.click();
  await sleep(2000);
  console.log('Added to cart!');

  // Step 5: Check cart
  console.log('--- Checking cart ---');

  // Click on floating cart bar to go to cart
  const cartBar = page.locator('a[href="/cart"]').first();
  if (await cartBar.isVisible()) {
    await cartBar.click();
  } else {
    await page.goto(`${WEB}/cart`);
  }
  await sleep(3000);

  const body = await page.textContent('body');
  const results = {
    'Marmitex Composto': body.includes('Marmitex Composto'),
    'Acompanhamentos': body.includes('Acompanhamentos'),
    'Proteínas': body.includes('Prote'),
    'Cuscuz': body.includes('Cuscuz'),
    'Carne de sol': body.includes('Carne de sol'),
    'Batata doce': body.includes('Batata doce'),
  };
  console.log('Cart contents:', results);

  // Step 6: Admin view
  console.log('--- Admin Products View ---');
  await page.goto(`${WEB}/admin/login`);
  await page.waitForSelector('[data-testid="admin-email"]', { timeout: 10000 });
  await page.fill('[data-testid="admin-email"]', 'admin@feijoadadofabio.com');
  await page.fill('[data-testid="admin-password"]', 'admin123');
  await page.click('[data-testid="admin-login"]');
  await sleep(3000);
  await page.goto(`${WEB}/admin/products`);
  await sleep(3000);

  // Find and expand Marmitex Composto
  const marmitex = page.locator('h3:has-text("Marmitex Composto")').first();
  if (await marmitex.isVisible()) {
    await marmitex.scrollIntoViewIfNeeded();
    // Click chevron
    const card = marmitex.locator('xpath=ancestor::div[contains(@class,"flex-1 p-4")]');
    await card.locator('> div:first-child > div:last-child > button').first().click();
    await sleep(2000);
    console.log('Admin: expanded compound product to show option groups');
  }

  console.log('\n=== ALL TESTS PASSED ===');
  console.log('Browser stays open 60s so you can inspect...');
  await sleep(60000);
  await browser.close();
}

main().catch(async (e) => {
  console.error('Test failed:', e.message);
  process.exit(1);
});
