// Local production assets only; never contacts the public API.
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const root = resolve('dist/angular-support-dashboard/browser');
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1:4200').pathname;
  if (path.startsWith('/api/')) {
    res.writeHead(404);
    res.end();
    return;
  }
  let file = resolve(root, '.' + path);
  if (!file.startsWith(root + '/') && !file.startsWith(root + '\\'))
    file = resolve(root, 'index.html');
  if (!extname(file) || !existsSync(file)) file = resolve(root, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((ok, fail) => {
  server.once('error', fail);
  server.listen(4200, '127.0.0.1', ok);
});
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const forbidden = [];
  page.on('request', (req) => {
    if (
      req.url().includes('/api/local-auth') ||
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method()) ||
      !req.url().startsWith('http://127.0.0.1:4200/')
    )
      forbidden.push('forbidden request');
  });
  await page.goto('http://127.0.0.1:4200/work-orders');
  await page.getByRole('heading', { name: 'Work orders', exact: true }).waitFor();
  assert.equal(await page.locator('input[type=password]').count(), 0);
  assert.equal(await page.getByRole('link', { name: 'Create work order (local)' }).count(), 0);
  await page.goto('http://127.0.0.1:4200/work-orders/new');
  await page
    .getByText('Work-order creation is available only as a local development preview.', {
      exact: false,
    })
    .waitFor();
  assert.equal(await page.locator('input, textarea, button[type=submit]').count(), 0);
  assert.deepEqual(forbidden, []);
  mkdirSync('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/11-release-read-only.png', fullPage: true });
  writeFileSync(
    'docs/M5_RELEASE_EVIDENCE.json',
    JSON.stringify(
      {
        browser: 'Chromium',
        checks: [
          'release list has no local login/create controls',
          'direct create route has no form',
          'no auth endpoint or mutation or external requests',
        ],
        localAssetsOnly: true,
      },
      null,
      2,
    ) + '\n',
  );
  await page.goto(pathToFileURL(resolve('docs/architecture.html')).href);
  await page.screenshot({ path: 'docs/screenshots/05-architecture.png', fullPage: true });
  console.log(
    'PASS: actual release browser has no local login/write controls or requests; architecture rendered.',
  );
} finally {
  if (browser) await browser.close();
  await new Promise((ok) => server.close(ok));
}
