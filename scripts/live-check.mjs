// Walks the published site at its real URL and plays a moment of each game.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SITE = process.env.SITE_URL ?? 'https://randogames.github.io/';
mkdirSync('playtest-out', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });

await page.goto(SITE, { waitUntil: 'load' });
console.log('landing:', await page.title(), '|', await page.$eval('h1', (e) => e.textContent));
console.log('cards:', await page.$$eval('a.card h2', (n) => n.map((e) => e.textContent.trim())));
await page.screenshot({ path: 'playtest-out/live-landing.png' });

for (const [slug, label] of [['spaceship-attack', 'Spaceship Attack'], ['island-escape', 'Island Escape']]) {
  await page.goto(SITE, { waitUntil: 'load' });
  await page.click(`a.card[href="${slug}/"]`);
  await page.waitForLoadState('load');
  await page.waitForSelector('button.mode', { timeout: 20000 });
  console.log(`${label}: ${new URL(page.url()).pathname} modes=${await page.$$eval('button.mode h2', (n) => n.map((e) => e.textContent))}`);
  await page.click('button.mode[data-id="adventure"]');
  await page.waitForTimeout(4000);
  const alive = await page.evaluate(() => !!document.querySelector('canvas'));
  console.log(`  canvas rendering: ${alive}`);
  await page.screenshot({ path: `playtest-out/live-${slug}.png` });
  await page.click('#home');
  await page.waitForLoadState('load');
  console.log(`  All games -> ${new URL(page.url()).pathname}`);
}
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'no errors, no failed requests');
await browser.close();
