// Checks that editing a file does NOT reload the game, shows the banner, and R restarts.
import { chromium } from 'playwright';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let loads = 0;
page.on('load', () => loads++);
await page.goto('http://localhost:5173/island-escape/');
await page.waitForSelector('button.mode');
await page.click('button.mode[data-id="adventure"]');
await page.waitForFunction(() => !!window.game, null, { timeout: 15000 });
await page.waitForTimeout(800);
await page.evaluate(() => { window.game.inventory.wood = 77; }); // state that a reload would wipe
const banner = () => page.evaluate(() => !!document.getElementById('update-banner'));
console.log('loads:', loads, 'banner before edit:', await banner());

const ts = 'src/island-escape/random.ts';
const html = 'island-escape/index.html';
const tsOrig = readFileSync(ts, 'utf8');
const htmlOrig = readFileSync(html, 'utf8');
try {
  appendFileSync(ts, '\n// touch\n');
  await page.waitForTimeout(1500);
  console.log('after TS edit -> loads:', loads, 'banner:', await banner(), 'wood kept:', await page.evaluate(() => window.game.inventory.wood));
  writeFileSync(html, htmlOrig + '\n<!-- touch -->\n');
  await page.waitForTimeout(1500);
  console.log('after HTML edit -> loads:', loads, 'banner:', await banner(), 'wood kept:', await page.evaluate(() => window.game.inventory.wood));
  await page.screenshot({ path: 'playtest-out/update-banner.png' });
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(2500);
  // After restarting, the mode picker is showing again, so the game object is gone.
  console.log('after R -> loads:', loads, 'banner:', await banner(),
    'back at mode picker:', await page.isVisible('button.mode'));
} finally {
  writeFileSync(ts, tsOrig);
  writeFileSync(html, htmlOrig);
}
await browser.close();
