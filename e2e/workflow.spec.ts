import { test, expect, Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const evidence: string[] = [];
function record(label: string) {
  evidence.push(label);
  console.log('PASS: ' + label);
}
const title = 'Restore fictional branch network access';
const description =
  'Fictional scenario: inspect the branch switch, restore connectivity and verify service with the operations team.';
const shots = resolve('docs/screenshots');
async function shot(page: Page, name: string) {
  // Explicitly mask login controls even when hidden/empty. Never capture devtools or network panels.
  mkdirSync(shots, { recursive: true });
  await page.screenshot({
    path: resolve(shots, name + '.png'),
    fullPage: true,
    mask: [
      page.locator('input[formcontrolname="username"]'),
      page.locator('input[type="password"]'),
    ],
  });
}
async function login(page: Page) {
  console.log('M5: submitting isolated fixture login');
  await page.getByLabel('Local username').fill(process.env.M5_USERNAME!);
  await page.getByLabel('Local password').fill(process.env.M5_PASSWORD!);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByText('Signed in', { exact: true })).toBeVisible();
}
async function form(page: Page, name: string, priority = 'HIGH') {
  await page.goto('/work-orders/new');
  await page.getByLabel('Title', { exact: true }).fill(name);
  await page.getByLabel('Description', { exact: true }).fill(description);
  await page.getByLabel(/^Priority/).selectOption(priority);
  await page.getByLabel('Requester email', { exact: true }).fill('operations@example.com');
}
function sql(query: string): string {
  if (!process.env.M5_PROJECT?.startsWith('workorder-m5-') || !process.env.M5_DB_CONTAINER)
    throw new Error('Missing isolated database');
  const result = spawnSync(
    'docker',
    [
      'exec',
      process.env.M5_DB_CONTAINER,
      'psql',
      '-U',
      'm5_fixture',
      '-d',
      'workorder',
      '-Atc',
      query,
    ],
    { encoding: 'utf8', timeout: 30_000 },
  );
  if (result.status !== 0) throw new Error('Isolated PostgreSQL assertion failed');
  return result.stdout.trim();
}
test('real Chromium workflow, validation, persistence, expiry, logout and blocked writes', async ({
  page,
  browser,
}) => {
  const badRequests: string[] = [];
  page.on('request', (request) => {
    if (
      !request.url().startsWith('http://127.0.0.1:4200/') &&
      !request.url().startsWith('ws://127.0.0.1:4200/')
    )
      badRequests.push('non-loopback request');
  });
  await page.goto('/work-orders');
  await expect(page.getByText('No work orders on this page.', { exact: false })).toBeVisible();
  record('fresh database empty state');
  const unauthorized = await page.evaluate(
    async () =>
      (
        await fetch('/api/work-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
      ).status,
  );
  expect(unauthorized).toBe(401);
  expect(sql('SELECT count(*) FROM work_orders')).toBe('0');
  record('anonymous browser write 401 and no database change');
  await login(page);
  record('login via real form');
  await form(page, '');
  // JavaScript \S accepts U+001C; Java Bean Validation rejects it. No validator bypass or mocked response.
  const invalid = page.waitForResponse(
    (r) => r.url().endsWith('/api/work-orders') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Create work order', exact: true }).click();
  expect((await invalid).status()).toBe(400);
  await expect(page.getByRole('alert')).toContainText('title: must not be blank');
  await expect(page.getByLabel('Title', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  record('real backend 400 field error displayed and associated with title');
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Due date (optional)').fill('2026-11-20');
  await expect(
    page.getByText('Check the highlighted fields and request values.', { exact: true }),
  ).toHaveCount(0);
  await shot(page, '03-create-form');
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/work-orders') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Create work order', exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  await page.waitForURL(/\/work-orders\/[1-9]\d*$/);
  const id = Number(new URL(page.url()).pathname.split('/').pop());
  expect(Number.isSafeInteger(id)).toBe(true);
  await expect(page.getByRole('heading', { name: `#${id} · ${title}` })).toBeVisible();
  record('valid browser create 201 and detail retrieval');
  await page.getByLabel(/^Status/).selectOption('IN_PROGRESS');
  const update = page.waitForResponse((r) => r.url().endsWith(`/api/work-orders/${id}/status`));
  await page.getByRole('button', { name: 'Update status', exact: true }).click();
  expect((await update).status()).toBe(200);
  await expect(page.getByText('Status saved. Reloading persisted work order.')).toBeVisible();
  await shot(page, '04-authenticated-workflow');
  await page.reload();
  await expect(page.getByText('Local session restored.', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: `#${id} · ${title}` })).toBeVisible();
  await expect(page.getByLabel(/^Status/)).toHaveValue('IN_PROGRESS');
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  expect(
    sql(
      `SELECT title || '|' || status || '|' || priority || '|' || requester_email || '|' || due_date FROM work_orders WHERE id=${id}`,
    ),
  ).toBe(`${title}|IN_PROGRESS|HIGH|operations@example.com|2026-11-20`);
  record(
    'full reload restores session; title description status priority email date persisted; independent PostgreSQL confirmation',
  );
  await shot(page, '02-work-order-details');
  for (const [name, priority] of [
    ['Inspect fictional warehouse printer', 'MEDIUM'],
    ['Review fictional service desk access', 'LOW'],
  ]) {
    await form(page, name, priority);
    await page.getByRole('button', { name: 'Create work order', exact: true }).click();
    await expect(page.getByRole('heading', { name: new RegExp(name) })).toBeVisible();
  }
  await page.goto('/work-orders');
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  await shot(page, '01-work-order-list');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot(page, '06-mobile-list');
  await page.goto(`/work-orders/${id}`);
  await expect(page.getByLabel(/^Status/)).toHaveValue('IN_PROGRESS');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot(page, '07-mobile-details');
  await form(page, 'Fictional mobile form');
  await page.getByLabel('Title', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Description', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await shot(page, '08-mobile-form');
  record('390px mobile list detail form without horizontal overflow; keyboard field navigation');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/work-orders/${id}`);
  await expect(page.getByLabel(/^Status/)).toHaveValue('IN_PROGRESS');
  // No session requests while waiting. Tomcat expiry is minute-granularity with background eviction.
  await page.waitForTimeout(130_000);
  await page.getByLabel(/^Status/).selectOption('COMPLETED');
  let mutationCount = 0;
  page.on('request', (request) => {
    if (request.method() === 'PATCH') mutationCount++;
  });
  const expired = page.waitForResponse((r) => r.url().endsWith(`/api/work-orders/${id}/status`));
  await page.getByRole('button', { name: 'Update status', exact: true }).click();
  expect((await expired).status()).toBe(401);
  await expect(
    page.getByText('Your local session expired or was invalidated. Sign in again.'),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  expect(mutationCount).toBe(1);
  expect(sql(`SELECT status FROM work_orders WHERE id=${id}`)).toBe('IN_PROGRESS');
  await shot(page, '09-expired-session');
  record(
    'real 1m inactivity session expires; browser PATCH 401; exactly one attempt; PostgreSQL unchanged',
  );
  await login(page);
  const logout = page.waitForResponse((r) => r.url().endsWith('/api/local-auth/logout'));
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  expect((await logout).status()).toBe(204);
  await expect(page.getByRole('button', { name: 'Update status', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Local password')).toHaveValue('');
  await shot(page, '10-logout');
  const blocked = await page.evaluate(
    async (orderId) =>
      (
        await fetch(`/api/work-orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: '{"status":"COMPLETED"}',
        })
      ).status,
    id,
  );
  expect(blocked).toBe(401);
  expect(sql(`SELECT status FROM work_orders WHERE id=${id}`)).toBe('IN_PROGRESS');
  record('re-login logout 204; empty password; disabled write; browser post-logout PATCH 401');
  // Separate context with no credentials/cookies also cannot write.
  const anonymous = await browser.newContext();
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto('http://127.0.0.1:4200/work-orders');
  const rejected = await anonymousPage.evaluate(
    async () => (await fetch('/api/work-orders', { method: 'POST', body: '{}' })).status,
  );
  expect(rejected).toBe(401);
  await anonymous.close();
  expect(badRequests).toEqual([]);
  writeFileSync(
    'docs/M5_BROWSER_EVIDENCE.json',
    JSON.stringify(
      { checks: evidence, browser: 'Chromium', fictionalDataOnly: true, secretsRecorded: false },
      null,
      2,
    ) + '\n',
  );
});
test('existing fictional support tickets retain filtering notes status and reload semantics', async ({
  page,
}) => {
  await page.goto('/tickets');
  await expect(page.getByRole('heading', { name: 'Ticket queue' })).toBeVisible();
  await page.getByLabel('Search tickets').fill('SUP-1048');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: /Scheduled report/ }).click();
  await page.getByLabel('Add an internal note').fill('Fictional M5 browser verification note.');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await expect(
    page.getByText('Fictional M5 browser verification note.', { exact: true }),
  ).toBeVisible();
  await page.getByLabel(/^Status/).selectOption('Resolved');
  await page.getByRole('button', { name: 'Save status', exact: true }).click();
  await expect(page.locator('.header-badges')).toContainText('Resolved');
  await page.reload();
  await expect(
    page.getByText('Fictional M5 browser verification note.', { exact: true }),
  ).toHaveCount(0);
});
