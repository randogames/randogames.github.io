// Checks Island Escape creative mode: flight, invulnerability, no pirates, starting supplies.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('playtest-out', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('GL Driver'))) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
const log = (...a) => console.log(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' '));

await page.goto('http://localhost:5173/island-escape/');
await page.waitForSelector('button.mode');
await page.click('button.mode[data-id="creative"]');
await page.waitForFunction(() => !!window.game, null, { timeout: 15000 });
await page.waitForTimeout(1000);

const state = () => page.evaluate(() => {
  const g = window.game; const i = g.inventory; const p = g.player.position;
  return { y: +p.y.toFixed(1), hp: Math.round(g.player.hp), hunger: Math.round(g.player.hunger),
    wood: i.wood, stone: i.stone, tools: [i.axe, i.pickaxe, i.sword, i.pot].filter(Boolean).length,
    hpText: document.getElementById('hp-text').textContent, stats: document.getElementById('stats').textContent };
});
log('creative start', await state());

await page.keyboard.down('Space'); await page.waitForTimeout(1800); 
log('flying up ->', (await state()).y);
await page.screenshot({ path: 'playtest-out/ie-creative-fly.png' });
await page.keyboard.up('Space');
await page.waitForTimeout(3000);
log('after releasing Space (should land) ->', (await state()).y);

await page.evaluate(() => { window.game.player.damage(80); window.game.player.hunger = 0; });
await page.waitForTimeout(1500);
log('after 80 damage and zero hunger ->', await state());

await page.evaluate(() => { const g = window.game; g.player.position.set(0, 0.35, 60); });
await page.waitForTimeout(13000);
log('after 13 s in deep water (no drowning expected) ->', await state());

await page.evaluate(() => { const g = window.game; g.player.respawn(); g.pirates.startRaid(g.player, g.notify); });
await page.waitForTimeout(2000);
log('pirate raid forced in creative: player hp', (await state()).hp);
await page.screenshot({ path: 'playtest-out/ie-creative.png' });

log('home button clickable:', await page.isVisible('#home'));
await page.click('#home');
await page.waitForLoadState('load');
log('landed on:', new URL(page.url()).pathname);

log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
