// Burst fire, missiles, ammo decay and boss-only upgrades.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('playtest-out', { recursive: true });
const browser = await chromium.launch();
const errors = [];
const log = (...a) => console.log(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' '));
const page = await browser.newPage({ viewport: { width: 900, height: 820 } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://localhost:5173/spaceship-attack/');
await page.waitForSelector('button.mode');
await page.click('button.mode[data-id="adventure"]');
await page.waitForFunction(() => !!window.game && typeof window.__step === 'function');
await page.waitForTimeout(400);

// --- Burst of 5 then a reload ---
log('burst fire:', await page.evaluate(() => {
  const g = window.game;
  g.loadout.ammo = 100; g.burstUsed = 0; g.reloadLeft = 0; g.fireCooldown = 0; g.bullets.length = 0;
  const shots = [];
  // Try 9 presses back to back with the between-shot delay elapsed each time.
  for (let i = 0; i < 9; i++) {
    g.fireCooldown = 0;
    const before = g.shotsFired;
    window.__fire();
    shots.push(g.shotsFired > before ? 'shot' : 'blocked');
  }
  return { sequence: shots, reloadLeftAfter: +g.reloadLeft.toFixed(2), burstSize: g.loadout.burstSize };
}));
log('after waiting out the reload:', await page.evaluate(async () => {
  const g = window.game;
  const t0 = Date.now();
  while (g.reloadLeft > 0 && Date.now() - t0 < 6000) await new Promise((r) => setTimeout(r, 60));
  g.fireCooldown = 0;
  const before = g.shotsFired;
  window.__fire();
  return { reloadLeft: g.reloadLeft, firedAgain: g.shotsFired > before, burstLeftNow: g.loadout.burstSize - g.burstUsed };
}));
await page.screenshot({ path: 'playtest-out/ab1-burst.png' });

// --- Missile homing ---
log('missile:', await page.evaluate(() => {
  const g = window.game;
  g.missiles.length = 0; g.enemies.length = 0; g.bullets.length = 0; g.missileLeft = 0;
  g.x = 240; g.y = 620;
  // Put a target off to one side so the missile has to turn toward it.
  g.enemies.push({ shape: 'brute', x: 90, y: 300, radius: 19, hp: 999, scoreValue: 1, vx: 0, vy: 0, fireTimer: 99, spin: 0, spinRate: 0 });
  window.__missile();
  const launched = g.missiles.length;
  const path = [];
  for (let i = 0; i < 200 && g.missiles.length; i++) {
    const m = g.missiles[0];
    if (i % 20 === 0) path.push({ x: Math.round(m.x), y: Math.round(m.y) });
    window.__step();
  }
  const enemy = g.enemies[0];
  return { launched, cooldownAfter: g.loadout.missileCooldown, path,
    enemyDamaged: enemy ? 999 - enemy.hp : 'enemy gone', missilesLeft: g.missiles.length };
}));
log('missile cooldown blocks a second launch:', await page.evaluate(() => {
  const g = window.game;
  g.missiles.length = 0; g.missileLeft = 5;
  window.__missile();
  return { missiles: g.missiles.length, secondsLeft: Math.ceil(g.missileLeft) };
}));
await page.screenshot({ path: 'playtest-out/ab2-missile.png' });

// --- Ammo drops decay ---
log('missile vs boss and splash:', await page.evaluate(() => {
  const g = window.game;
  g.over = false; g.won = false; g.hull = 100; g.bossesDefeated = 0;
  g.missiles.length = 0; g.enemies.length = 0; g.bullets.length = 0; g.missileLeft = 0;
  g.elapsed = window.__bossDueAt(1, 0) + 1;
  window.__step();
  let guard = 0;
  while (g.boss?.entering && guard++ < 1000) window.__step();
  // First: boss alone, so the boss is the closest thing.
  const bossHpBefore = g.boss.hp;
  g.x = g.boss.x; g.y = 620;
  window.__missile();
  for (let i = 0; i < 300 && g.missiles.length; i++) window.__step();
  const bossDamage = bossHpBefore - g.boss.hp;

  // Then: a cluster of ships, to check the direct hit plus splash.
  g.missileLeft = 0;
  for (const dx of [-14, 14]) {
    g.enemies.push({ shape: 'scout', x: 240 + dx, y: 300, radius: 13, hp: 99, scoreValue: 1, vx: 0, vy: 0, fireTimer: 99, spin: 0, spinRate: 0 });
  }
  g.x = 240; g.y = 620;
  window.__missile();
  for (let i = 0; i < 300 && g.missiles.length; i++) window.__step();
  return { bossDamage, shipDamage: g.enemies.map((e) => 99 - e.hp) };
}));

log('ammo drops over time:', await page.evaluate(() => {
  const g = window.game;
  const rows = [];
  for (const minutes of [0, 2, 4, 8, 12]) {
    g.elapsed = minutes * 60;
    let drops = 0; let total = 0;
    for (let i = 0; i < 300; i++) {
      g.pickups.length = 0;
      g.enemies.length = 0;
      g.enemies.push({ shape: 'scout', x: 240, y: 300, radius: 13, hp: 1, scoreValue: 1, vx: 0, vy: 0, fireTimer: 99, spin: 0, spinRate: 0 });
      g.bullets.push({ x: 240, y: 300, vx: 0, vy: 0, damage: 99, hostile: false });
      window.__step();
      if (g.pickups.length) { drops++; total += g.pickups.reduce((a, p) => a + p.amount, 0); }
    }
    rows.push({ minutes, dropRate: Math.round((drops / 300) * 100) + '%', ammoPerDrop: drops ? Math.round(total / drops) : 0 });
  }
  return rows;
}));

// --- Upgrades come only from bosses ---
log('upgrades from 200 ordinary kills:', await page.evaluate(() => {
  const g = window.game;
  g.elapsed = 0; g.upgradesEarned = 0; g.boss = null; g.over = false; g.won = false; g.hull = 100;
  for (let i = 0; i < 200; i++) {
    g.enemies.length = 0;
    g.enemies.push({ shape: 'scout', x: 240, y: 300, radius: 13, hp: 1, scoreValue: 1, vx: 0, vy: 0, fireTimer: 99, spin: 0, spinRate: 0 });
    g.bullets.push({ x: 240, y: 300, vx: 0, vy: 0, damage: 99, hostile: false });
    g.elapsed = 1; // keep the clock before the first boss
    window.__step();
  }
  return { kills: g.kills, upgrades: g.upgradesEarned };
}));
log('boss schedule and rewards:', await page.evaluate(() => {
  const g = window.game;
  g.over = false; g.won = false; g.hull = 100; g.bossesDefeated = 0; g.upgradesEarned = 0; g.boss = null;
  const rows = [];
  for (let tier = 1; tier <= 12; tier++) {
    g.elapsed = window.__bossDueAt(tier, 0) + 1;
    window.__step();
    if (!g.boss) { rows.push({ tier, error: 'no boss' }); continue; }
    const name = g.boss.name;
    const hp = g.boss.maxHp;
    let guard = 0;
    while (g.boss?.entering && guard++ < 1000) window.__step();
    const before = g.upgradesEarned;
    let shots = 0;
    while (g.boss && shots < 4000) {
      shots++;
      g.enemies.length = 0;
      g.bullets.push({ x: g.boss.x, y: g.boss.y, vx: 0, vy: 0, damage: 1, hostile: false });
      window.__step();
    }
    rows.push({ tier, name, hp, plainShots: shots, upgradesGained: g.upgradesEarned - before, dueAtSec: Math.round(window.__bossDueAt(tier, 0)) });
  }
  return { rows, won: g.won, bossesDefeated: g.bossesDefeated };
}));
await page.waitForTimeout(300);
log('ending overlay:', await page.$eval('#overlay h1', (e) => e.textContent).catch(() => 'none'));
log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
