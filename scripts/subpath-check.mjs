// Serves the built site under a subpath and checks every page and link works,
// the way a GitHub Pages project site would serve it.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const BASE = '/game';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404).end('outside base');
    return;
  }
  let rel = url.pathname.slice(BASE.length) || '/';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = join('dist', normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const origin = `http://localhost:${server.address().port}${BASE}`;
console.log('serving dist at', origin);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 820 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('requestfailed', (r) => problems.push(`failed request: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });

await page.goto(`${origin}/`);
await page.waitForLoadState('load');
console.log('landing page title:', await page.title(), '| heading:', await page.$eval('h1', (e) => e.textContent));
const links = await page.$$eval('a.card', (els) => els.map((e) => e.getAttribute('href')));
console.log('game links:', links);

for (const name of ['spaceship-attack', 'island-escape']) {
  await page.goto(`${origin}/`);
  await page.click(`a.card[href="${name}/"]`);
  await page.waitForLoadState('load');
  console.log(`${name}: url=${new URL(page.url()).pathname} title="${await page.title()}" modePicker=${await page.isVisible('button.mode')}`);
  await page.click('button.mode[data-id="adventure"]');
  await page.waitForTimeout(2500);
  const started = await page.evaluate(() => typeof window.game === 'object' || !!document.querySelector('canvas'));
  console.log(`  started after picking a mode: ${started}`);
  await page.click('#home');
  await page.waitForLoadState('load');
  console.log(`  All games button -> ${new URL(page.url()).pathname}`);
}
await page.screenshot({ path: 'playtest-out/subpath-landing.png' });
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no page errors, no failed requests');
await browser.close();
server.close();
