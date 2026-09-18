import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 820 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://localhost:5173/spaceship-attack/');
await page.waitForSelector('button.mode');
await page.click('button.mode[data-id="adventure"]');
await page.waitForFunction(() => !!window.game && typeof window.__step === 'function');
await page.waitForTimeout(300);

console.log('--- damage after many upgrades (was unbounded) ---');
console.log(await page.evaluate(() => {
  const g = window.game;
  const rows = [];
  for (const n of [0, 5, 10, 20, 50, 200]) {
    g.loadout.guns = 1; g.loadout.damage = 1; g.loadout.maxAmmo = 160; g.loadout.ammo = 160;
    g.upgradesEarned = 0; g.bossesDefeated = Math.min(5, Math.floor(n / 10));
    for (let i = 0; i < n; i++) window.__grantUpgrade();
    rows.push({ upgrades: n, bosses: g.bossesDefeated, guns: g.loadout.guns,
      damagePerBullet: window.__shotDamage(), perPress: window.__shotDamage() * g.loadout.guns,
      maxAmmo: g.loadout.maxAmmo });
  }
  return rows;
}));

console.log('--- presses needed per boss at full power ---');
console.log(await page.evaluate(() => {
  const g = window.game;
  g.loadout.guns = 3; g.loadout.damage = 1; g.upgradesEarned = 0;
  for (let i = 0; i < 200; i++) window.__grantUpgrade();
  const rows = [];
  for (let tier = 1; tier <= 5; tier++) {
    g.bossesDefeated = tier - 1;
    const perPress = window.__shotDamage() * g.loadout.guns;
    const hp = window.__bossHp(tier);
    rows.push({ tier, bossHp: hp, perPress, pressesNeeded: Math.ceil(hp / perPress) });
  }
  return rows;
}));

console.log('--- boss arrival times (seconds) ---');
console.log(await page.evaluate(() => {
  const rows = [];
  for (const kpm of [0, 8, 18, 30]) {
    rows.push({ killsPerMinute: kpm, due: [1, 2, 3, 4, 5].map((t) => Math.round(window.__bossDueAt(t, kpm))) });
  }
  return rows;
}));
await browser.close();
