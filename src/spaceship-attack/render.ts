import { VIEW_HEIGHT, VIEW_WIDTH } from './world';
import { MAX_HULL } from './entities';
import { HEAL_AMMO_SHARE } from './game';
import { drawBoss, drawBullet, drawEnemy, drawPickup, drawPlayer } from './sprites';
import { currentSkin, secondsToNextBoss } from './game';
import type { Starfield } from './starfield';
import type { GameState } from './game';

/** Fits the play area to the window while keeping its proportions. */
export function fitCanvas(canvas: HTMLCanvasElement): number {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const scale = Math.min(window.innerWidth / VIEW_WIDTH, window.innerHeight / VIEW_HEIGHT);
  canvas.width = Math.round(VIEW_WIDTH * scale * dpr);
  canvas.height = Math.round(VIEW_HEIGHT * scale * dpr);
  canvas.style.width = `${VIEW_WIDTH * scale}px`;
  canvas.style.height = `${VIEW_HEIGHT * scale}px`;
  return scale * dpr;
}

export function draw(ctx: CanvasRenderingContext2D, scale: number, g: GameState, stars: Starfield): void {
  const skin = currentSkin(g);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, '#0a1028');
  sky.addColorStop(1, '#05070f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  stars.draw(ctx);

  for (const p of g.pickups) {
    ctx.save();
    ctx.translate(p.x, p.y);
    drawPickup(ctx, p.pulse);
    ctx.restore();
  }

  for (const b of g.bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    drawBullet(ctx, b.hostile, skin);
    ctx.restore();
  }

  for (const e of g.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    drawEnemy(ctx, e.shape, e.spin);
    ctx.restore();
  }

  if (g.boss) {
    ctx.save();
    ctx.translate(g.boss.x, g.boss.y);
    drawBoss(ctx, g.boss.tier, g.boss.radius, g.boss.color, g.boss.phase);
    ctx.restore();
  }

  const blink = g.hurtFlash > 0 && Math.sin(g.hurtFlash * 60) < -0.3;
  if (!g.over && !blink) {
    ctx.save();
    ctx.translate(g.x, g.y);
    drawPlayer(ctx, g.boosting, g.tilt, skin, g.bossesDefeated);
    ctx.restore();
  }

  for (const x of g.explosions) {
    const t = 1 - x.life / x.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(x.x, x.y);
    const r = x.size * (0.3 + t * 0.9);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    glow.addColorStop(0, '#fff3b0');
    glow.addColorStop(0.5, '#ff8b25');
    glow.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (g.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255, 40, 40, ${g.hurtFlash * 0.4})`;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  if (g.healFlash > 0) {
    ctx.save();
    ctx.globalAlpha = g.healFlash / 0.6;
    ctx.strokeStyle = '#7dffb0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 20 + (1 - g.healFlash / 0.6) * 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawHud(ctx, g);
  drawHealAbility(ctx, g);
  if (g.boss && !g.boss.entering) drawBossBar(ctx, g);
}

/**
 * The heal ability, shown as its own slot so it reads as an ability rather
 * than a line of stats: green and lit when it can be used, dim otherwise.
 */
function drawHealAbility(ctx: CanvasRenderingContext2D, g: GameState): void {
  const cost = Math.ceil(g.loadout.maxAmmo * HEAL_AMMO_SHARE);
  const hurt = g.hull < MAX_HULL;
  const affordable = g.loadout.ammo >= cost;
  const ready = hurt && affordable;

  const w = 116;
  const h = 46;
  const x = 12;
  // Clear of the control hints printed along the bottom of the page.
  const y = VIEW_HEIGHT - h - 48;

  ctx.save();
  // A brief pulse right after healing.
  const pulse = g.healFlash > 0 ? g.healFlash / 0.6 : 0;
  ctx.fillStyle = ready ? 'rgba(20, 70, 48, .85)' : 'rgba(12, 18, 28, .72)';
  ctx.strokeStyle = pulse > 0
    ? `rgba(160, 255, 200, ${0.5 + pulse * 0.5})`
    : ready
      ? '#7dffb0'
      : 'rgba(255,255,255,.22)';
  ctx.lineWidth = ready ? 2 : 1.5;
  roundRect(ctx, x, y, w, h, 9);
  ctx.fill();
  ctx.stroke();

  // Key cap.
  ctx.fillStyle = ready ? '#7dffb0' : 'rgba(238,243,248,.5)';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText('H', x + 11, y + 8);

  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('HEAL', x + 32, y + 7);

  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = affordable ? 'rgba(238,243,248,.8)' : '#ff8a80';
  ctx.fillText(`${cost} ammo`, x + 32, y + 25);

  if (!hurt && affordable) {
    ctx.fillStyle = 'rgba(238,243,248,.45)';
    ctx.fillText('hull full', x + 11, y + 25);
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Boss name and health across the top of the screen. */
function drawBossBar(ctx: CanvasRenderingContext2D, g: GameState): void {
  const boss = g.boss;
  if (!boss) return;
  // Sits just under the stats, on the same side of the screen as the boss.
  const width = VIEW_WIDTH - 80;
  const barY = 122;
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fillRect(40, barY, width, 14);
  ctx.fillStyle = boss.color;
  ctx.fillRect(40, barY, width * (boss.hp / boss.maxHp), 14);
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, barY, width, 14);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eef3f8';
  ctx.fillText(`${boss.name}   ${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`, VIEW_WIDTH / 2, barY + 18);
  ctx.textAlign = 'left';
}

function drawHud(ctx: CanvasRenderingContext2D, g: GameState): void {
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textBaseline = 'top';

  // Hull bar.
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.fillRect(12, 12, 140, 10);
  ctx.fillStyle = g.hull < 30 ? '#e53935' : '#4fc3f7';
  ctx.fillRect(12, 12, 140 * (g.hull / MAX_HULL), 10);
  ctx.fillStyle = '#eef3f8';
  ctx.fillText(g.mode.invulnerable ? 'Hull: invulnerable' : `Hull ${Math.ceil(g.hull)}/${MAX_HULL}`, 12, 28);

  ctx.fillStyle = g.loadout.ammo === 0 ? '#e53935' : '#eef3f8';
  ctx.fillText(`Ammo ${g.loadout.ammo}/${g.loadout.maxAmmo}`, 12, 46);
  ctx.fillStyle = '#eef3f8';
  const skinBonus = currentSkin(g).damageBonus;
  ctx.fillText(`Cannons ${g.loadout.guns}   Damage ${g.loadout.damage + skinBonus}`, 12, 64);

  ctx.textAlign = 'right';
  ctx.fillText(`${g.mode.name} mode   ${currentSkin(g).name}`, VIEW_WIDTH - 12, 12);
  ctx.fillText(`Score ${g.score}   Kills ${g.kills}`, VIEW_WIDTH - 12, 30);
  ctx.fillText(`${Math.round(g.distance)} m${g.boosting ? '   BOOST' : ''}`, VIEW_WIDTH - 12, 48);
  if (!g.boss) {
    const wait = secondsToNextBoss(g);
    ctx.fillStyle = 'rgba(238,243,248,.7)';
    ctx.fillText(
      wait === null ? 'All bosses beaten' : `Next boss in ${Math.ceil(wait)}s`,
      VIEW_WIDTH - 12,
      66,
    );
    ctx.fillStyle = '#eef3f8';
  }
  ctx.textAlign = 'left';
}
