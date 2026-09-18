// Headless smoke test for Spaceship Attack. Needs the dev server running (npm run dev).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('playtest-out', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const log = (...a) => console.log(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' '));

async function open(mode) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('GL Driver'))) errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto('http://localhost:5173/spaceship-attack/');
  await page.waitForSelector('button.mode');
  await page.click(`button.mode[data-id="${mode}"]`);
  await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });
  await page.waitForTimeout(400);
  return page;
}
const state = (page) => page.evaluate(() => {
  const g = window.game; const p = g.player.position;
  return { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1), dist: Math.round(g.player.distance),
    hull: Math.round(g.player.hull), ammo: g.loadout.ammo, guns: g.loadout.guns, damage: g.loadout.damage,
    enemies: g.enemies.count, bullets: g.bullets.list.length, kills: g.getKills(), over: g.isOver(),
    stats: document.getElementById('stats').textContent };
});
const hold = async (page, key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

// ---- Mode picker ----
const picker = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await picker.goto('http://localhost:5173/spaceship-attack/');
await picker.waitForSelector('button.mode');
log('modes offered:', await picker.$$eval('button.mode h2', (n) => n.map((e) => e.textContent)));
await picker.screenshot({ path: 'playtest-out/sa1-modes.png' });
await picker.close();

// ---- Adventure mode ----
let page = await open('adventure');
const s0 = await state(page);
log('adventure start', s0);

await hold(page, 'KeyD', 700);
const s1 = await state(page);
log('after steering right', { x: s1.x, flewForward: s1.z < s0.z, dist: s1.dist });

const beforeBoost = (await state(page)).dist;
await hold(page, 'ShiftLeft', 1000);
const afterBoost = (await state(page)).dist;
await page.waitForTimeout(1000);
const afterCruise = (await state(page)).dist;
log('metres in 1s boosting:', afterBoost - beforeBoost, 'cruising:', afterCruise - afterBoost);

await hold(page, 'Space', 600);
const shot = await state(page);
log('shooting -> bullets in air:', shot.bullets, 'ammo used:', s0.ammo - shot.ammo);

// Let it fight for a while; enemies spawn and the player should score kills.
await page.waitForTimeout(1500);
log('enemies spawned:', (await state(page)).enemies);
await page.screenshot({ path: 'playtest-out/sa2-adventure.png' });

// Force kills by aiming at the nearest enemy each frame, to check ammo + upgrades.
await page.evaluate(() => {
  window.__cheatKill = setInterval(() => {
    const g = window.game;
    const e = g.enemies.nearest(g.player.position);
    if (e) { g.player.position.x = e.x; g.player.position.y = e.y; }
  }, 50);
});
await page.keyboard.down('Space');
await page.waitForFunction(() => window.game.getKills() >= 4, null, { timeout: 60000 }).catch(() => {});
await page.keyboard.up('Space');
await page.evaluate(() => clearInterval(window.__cheatKill));
const fought = await state(page);
log('after fighting', { kills: fought.kills, ammo: fought.ammo, guns: fought.guns, hull: fought.hull });
log('upgrade message shown:', await page.$$eval('.msg', (n) => n.map((e) => e.textContent)));
await page.screenshot({ path: 'playtest-out/sa3-upgraded.png' });

// Damage and game over.
await page.evaluate(() => { window.game.player.hull = 8; });
await page.waitForFunction(() => window.game.isOver(), null, { timeout: 60000 }).catch(() => {});
log('adventure game over:', (await state(page)).over, await page.$eval('#overlay h1', (e) => e.textContent).catch(() => 'no overlay'));
await page.screenshot({ path: 'playtest-out/sa4-gameover.png' });
await page.close();

// ---- Creative mode ----
page = await open('creative');
const c0 = await state(page);
log('creative start', { ammo: c0.ammo, hull: c0.hull, stats: c0.stats });
await page.evaluate(() => { window.game.player.damage(90); });
await page.waitForTimeout(200);
log('hull after 90 damage in creative:', (await state(page)).hull);
await hold(page, 'KeyW', 1200);
log('climbed above adventure ceiling (46):', (await state(page)).y);
await hold(page, 'Space', 500);
const c1 = await state(page);
log('creative ammo still unlimited:', c1.ammo, 'enemies:', c1.enemies);
await page.screenshot({ path: 'playtest-out/sa5-creative.png' });
await page.close();

log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
