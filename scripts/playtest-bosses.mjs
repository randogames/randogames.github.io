// Checks boss progression, skins, shot counts and creative-mode harmlessness.
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
  await page.click(`button.mode[data-id="${mode}"]`);
  await page.waitForFunction(() => !!window.game && typeof window.__step === 'function');
  await page.waitForTimeout(300);
  return page;
}

// Shot counts for each enemy colour with the plain starting cannon.
let page = await open('adventure');
log('shots to kill each enemy type:', await page.evaluate(() => {
  const g = window.game;
  const out = {};
  for (const shape of ['scout', 'brute', 'darter']) {
    g.enemies.length = 0; g.bullets.length = 0;
    const radius = shape === 'brute' ? 19 : shape === 'scout' ? 13 : 11;
    const hp = { scout: 2, brute: 3, darter: 1 }[shape];
    g.enemies.push({ shape, x: 240, y: 300, radius, hp, scoreValue: 1, vx: 0, vy: 0, fireTimer: 99, spin: 0, spinRate: 0 });
    let shots = 0;
    while (g.enemies.length && shots < 20) {
      shots++;
      g.bullets.push({ x: 240, y: 300, vx: 0, vy: 0, damage: 1, hostile: false });
      window.__step();
    }
    out[`${shape} (${shape === 'scout' ? 'purple' : shape === 'brute' ? 'red' : 'teal'})`] = shots;
  }
  return out;
}));

// Boss HP in plain bullets, plus skin unlocks and the win at the fifth boss.
log('boss progression:', await page.evaluate(() => {
  const g = window.game;
  const rows = [];
  g.over = false; g.won = false; g.hull = 100; g.bossesDefeated = 0; g.score = 0;
  g.enemies.length = 0; g.bullets.length = 0; g.pickups.length = 0;
  for (let tier = 1; tier <= 5; tier++) {
    g.score = 5000 * tier;
    window.__step();
    if (!g.boss) { rows.push({ tier, error: 'no boss spawned' }); continue; }
    const declaredHp = g.boss.maxHp;
    const name = g.boss.name;
    // Hit it with plain damage-1 bullets and count them.
    // Let it fly into view first: shots fired while it is still off-screen are culled.
    let guard = 0;
    while (g.boss?.entering && guard++ < 1000) window.__step();
    let shots = 0;
    while (g.boss && shots < 3000) {
      shots++;
      // Clear minions so only the boss can absorb the shot.
      g.enemies.length = 0;
      g.bullets.push({ x: g.boss.x, y: g.boss.y, vx: 0, vy: 0, damage: 1, hostile: false });
      window.__step();
    }
    rows.push({ tier, name, declaredHp, plainShotsNeeded: shots, skinAfter: window.__skin(), won: g.won });
  }
  return rows;
}));
log('final state: won =', await page.evaluate(() => window.game.won));
await page.waitForTimeout(400);
log('ending overlay:', await page.$eval('#overlay h1', (e) => e.textContent).catch(() => 'none'));
await page.close();

// Boss visuals
page = await open('adventure');
await page.evaluate(() => { const g = window.game; g.score = 5000; window.__step(); });
await page.waitForTimeout(2500);
log('boss on screen:', await page.evaluate(() => window.game.boss?.name ?? 'none'));
await page.screenshot({ path: 'playtest-out/sa6-boss.png' });
await page.evaluate(() => { const g = window.game; g.bossesDefeated = 5; });
await page.waitForTimeout(600);
log('skin at 5 bosses:', await page.evaluate(() => window.__skin()));
await page.screenshot({ path: 'playtest-out/sa7-final-skin.png' });
await page.close();

// Creative: ships come but cannot hurt you.
page = await open('creative');
await page.waitForTimeout(6000);
const creative = await page.evaluate(() => {
  const g = window.game;
  return { enemies: g.enemies.length, hull: g.hull, hostileBullets: g.bullets.filter((b) => b.hostile).length };
});
log('creative after 6 s:', creative);
await page.evaluate(() => {
  const g = window.game;
  g.enemies.push({ shape: 'brute', x: g.x, y: g.y, radius: 19, hp: 9, scoreValue: 1, vx: 0, vy: 0, fireTimer: 0.01, spin: 0, spinRate: 0 });
});
await page.waitForTimeout(1500);
log('creative hull after a ship rams and shoots:', await page.evaluate(() => window.game.hull));
await page.screenshot({ path: 'playtest-out/sa8-creative-enemies.png' });
await page.close();

log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
