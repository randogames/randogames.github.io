// Headless smoke test for Spaceship Attack (2D). Needs the dev server running (npm run dev).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('playtest-out', { recursive: true });
const browser = await chromium.launch();
const errors = [];
const log = (...a) => console.log(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' '));

async function open(mode) {
  const page = await browser.newPage({ viewport: { width: 900, height: 820 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto('http://localhost:5173/spaceship-attack/');
  await page.waitForSelector('button.mode');
  if (mode) {
    await page.click(`button.mode[data-id="${mode}"]`);
    await page.waitForFunction(() => !!window.game, null, { timeout: 10000 });
    await page.waitForTimeout(300);
  }
  return page;
}
const state = (page) => page.evaluate(() => {
  const g = window.game;
  return { x: Math.round(g.x), y: Math.round(g.y), hull: Math.round(g.hull), ammo: g.loadout.ammo, max: g.loadout.maxAmmo,
    guns: g.loadout.guns, damage: g.loadout.damage, kills: g.kills, score: g.score, upgrades: g.upgradesEarned,
    shots: g.shotsFired, enemies: g.enemies.length, bullets: g.bullets.length, over: g.over };
});
const hold = async (page, key, ms) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };

let page = await open(null);
log('modes offered:', await page.$$eval('button.mode h2', (n) => n.map((e) => e.textContent)));
await page.screenshot({ path: 'playtest-out/sa1-modes.png' });
log('home button visible on picker:', await page.isVisible('#home'));
await page.close();

// ---- Adventure ----
page = await open('adventure');
const s0 = await state(page);
log('adventure start', s0);
await hold(page, 'KeyA', 1600);
const left = await state(page);
await hold(page, 'KeyD', 2600);
const right = await state(page);
const width = await page.evaluate(() => 480);
log('moved side to side: leftmost', left.x, 'rightmost', right.x, 'of', width, '-> spans full width:', left.x <= 20 && right.x >= width - 20);
await hold(page, 'KeyW', 1200);
log('climb ceiling in adventure:', (await state(page)).y);

// Holding Space must fire exactly one shot: no auto-fire.
await hold(page, 'Space', 1500);
const heldShot = await state(page);
log('HOLDING Space for 1.5 s -> shots fired:', heldShot.shots, '(1 means no auto-fire)');
for (let i = 0; i < 4; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(220); }
const tapped = await state(page);
log('4 separate presses -> shots fired total:', tapped.shots, 'ammo spent', s0.ammo - tapped.ammo);

await page.waitForTimeout(2500);
log('enemies on screen:', (await state(page)).enemies);
await page.screenshot({ path: 'playtest-out/sa2-adventure.png' });

// Chase and shoot the nearest enemy until a few die.
await page.evaluate(() => {
  window.__aim = setInterval(() => {
    const g = window.game;
    const e = g.enemies[0];
    if (e) g.x = e.x;
    g.loadout.ammo = Math.max(g.loadout.ammo, 20);
  }, 40);
});
const tapUntilKills = setInterval(() => page.keyboard.press('Space').catch(() => {}), 200);
await page.waitForFunction(() => window.game.kills >= 3, null, { timeout: 60000 }).catch(() => {});
clearInterval(tapUntilKills);
await page.evaluate(() => clearInterval(window.__aim));
const fought = await state(page);
log('after fighting', { kills: fought.kills, upgrades: fought.upgrades, guns: fought.guns, score: fought.score, ammo: fought.ammo });
// Upgrades are a 20% chance per kill, and ammo drops in tight clusters of 2-3.
const drops = await page.evaluate(() => {
  const g = window.game;
  g.pickups.length = 0;
  g.upgradesEarned = 0;
  let upgrades = 0;
  const spreads = [];
  const counts = [];
  for (let i = 0; i < 400; i++) {
    const before = g.upgradesEarned;
    g.pickups.length = 0;
    g.enemies.push({ shape: 'scout', x: 240, y: 300, radius: 13, hp: 1, scoreValue: 1, vx: 0, vy: 0, fireTimer: 99, spin: 0, spinRate: 0 });
    g.bullets.push({ x: 240, y: 300, vx: 0, vy: 0, damage: 99, hostile: false });
    window.__step();
    if (g.upgradesEarned > before) upgrades++;
    if (g.pickups.length) {
      counts.push(g.pickups.length);
      const xs = g.pickups.map((p) => p.x);
      spreads.push(Math.max(...xs) - Math.min(...xs));
    }
  }
  return { upgrades, trials: 400, counts: [...new Set(counts)].sort(), maxSpread: Math.max(...spreads) };
});
log('upgrade rate over', drops.trials, 'kills:', (drops.upgrades / drops.trials * 100).toFixed(1) + '% (target 20%)');
log('ammo crates per kill:', JSON.stringify(drops.counts), 'widest gap between crates:', drops.maxSpread.toFixed(0), 'px');
log('messages:', await page.$$eval('.msg', (n) => n.map((e) => e.textContent)));
await page.screenshot({ path: 'playtest-out/sa3-upgraded.png' });

// Repair ability: costs 20% of the magazine and refills the hull.
await page.evaluate(() => { const g = window.game; g.over = false; g.hull = 30; g.loadout.ammo = g.loadout.maxAmmo; });
const beforeHeal = await state(page);
await page.keyboard.press('KeyH'); await page.waitForTimeout(200);
const afterHeal = await state(page);
log('repair: hull', beforeHeal.hull, '->', afterHeal.hull, '| ammo', beforeHeal.ammo, '->', afterHeal.ammo,
    '| cost', beforeHeal.ammo - afterHeal.ammo, 'expected', Math.ceil(beforeHeal.max * 0.2));
await page.keyboard.press('KeyH'); await page.waitForTimeout(200);
log('repair at full hull is refused (ammo unchanged):', (await state(page)).ammo === afterHeal.ammo);
await page.evaluate(() => { const g = window.game; g.over = false; g.hull = 30; g.loadout.ammo = 2; });
await page.keyboard.press('KeyH'); await page.waitForTimeout(200);
const poor = await state(page);
log('repair without enough ammo refused: hull', poor.hull, 'ammo', poor.ammo);
log('repair messages:', await page.$$eval('.msg', (n) => n.map((e) => e.textContent)));

await page.evaluate(() => { window.game.hull = 5; });
await page.waitForFunction(() => window.game.over, null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(300);
log('game over:', (await state(page)).over, await page.$eval('#overlay h1', (e) => e.textContent).catch(() => 'none'));
await page.screenshot({ path: 'playtest-out/sa4-gameover.png' });
await page.close();

// ---- Creative ----
page = await open('creative');
const c0 = await state(page);
log('creative start', { ammo: c0.ammo, max: c0.max, hull: c0.hull });
await page.evaluate(() => { window.game.hull = 100; window.game.enemies.push(...[]); });
await page.evaluate(() => { const g = window.game; g.bullets.push({ x: g.x, y: g.y, vx: 0, vy: 0, damage: 50, hostile: true }); });
await page.waitForTimeout(300);
log('hull after a hostile shot in creative:', (await state(page)).hull);
await hold(page, 'KeyW', 2000);
log('creative climbs higher than adventure:', (await state(page)).y);
for (let i = 0; i < 10; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(200); }
const c1 = await state(page);
log('creative shots', c1.shots, 'upgrades from shooting', c1.upgrades, 'ammo now', c1.ammo, 'of', c1.max);
log('creative enemies (should be 0):', c1.enemies);
await page.screenshot({ path: 'playtest-out/sa5-creative.png' });
log('clicking All games goes home:');
await page.click('#home');
await page.waitForLoadState('load');
log('  landed on:', new URL(page.url()).pathname, await page.$eval('h1', (e) => e.textContent));
await page.close();

log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
