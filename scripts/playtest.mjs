// Headless smoke test: drives the running dev server (npm run dev) through the main mechanics.
// Usage: node scripts/playtest.mjs   (screenshots land in playtest-out/)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('playtest-out', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('GL Driver'))) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/island-escape/');
await page.waitForTimeout(1500);

const log = (...a) => console.log(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' '));
const shot = (name) => page.screenshot({ path: `playtest-out/${name}.png` });
const press = async (key, wait = 120) => { await page.keyboard.press(key); await page.waitForTimeout(wait); };
const state = () => page.evaluate(() => {
  const g = window.game; const i = g.inventory;
  return { held: i.held, wood: i.wood, stone: i.stone, cooked: i.cookedMeat, hp: Math.round(g.player.hp),
    selected: document.querySelector('.slot.selected')?.textContent ?? null,
    owned: [...document.querySelectorAll('.slot.owned')].length,
    toolInHand: g.player.toolMesh ? g.player.toolMesh.children.length : 0 };
});

log('start', await state());
await press('Digit1');
log('press 1 with no axe ->', await state());

await page.evaluate(() => { const g = window.game; g.inventory.wood = 40; g.inventory.stone = 30; g.inventory.rawMeat = 1; });
await press('KeyC'); await press('Digit1'); await press('Digit2'); await press('Digit3'); await press('Digit4'); await press('Digit5'); await press('Digit6'); await press('KeyC');
log('after crafting', await state());

await press('Digit1'); log('hold axe ->', await state()); await shot('hotbar-axe');
await press('Digit3'); log('hold sword ->', await state()); await shot('hotbar-sword');
await press('Digit3'); log('press 3 again (unequip) ->', await state());

// Axe doubles wood: chop with and without
const chopWith = async () => {
  await page.evaluate(() => { const g = window.game; const t = g.trees.nearestStanding(g.player.position); g.player.position.set(t.x + 1.5, t.y + 0.8, t.z); g.inventory.wood = 0; });
  await press('KeyE'); return (await state()).wood;
};
log('wood per hit, bare hands:', await chopWith());
await press('Digit1');
log('wood per hit, axe held:', await chopWith());

// Cooking needs the pot in hand
await page.evaluate(() => { const g = window.game; const f = g.fires[0].position; g.player.position.set(f.x + 1.5, f.y + 0.8, f.z); });
await press('Digit4'); log('hold pot ->', await state());
await press('KeyC'); await press('Digit7'); await press('KeyC');
log('cooked with pot held ->', await state());
await shot('hotbar-pot');

log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
