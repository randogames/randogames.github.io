import { VIEW_HEIGHT, VIEW_WIDTH } from './world';
import { MAX_HULL } from './entities';
import { HEAL_AMMO_SHARE } from './game';
import { drawBoss, drawBullet, drawEnemy, drawMissile, drawPickup, drawPlayer } from './sprites';
import { ammoDropChance, burstLeft, currentSkin, secondsToNextBoss } from './game';
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

  for (const m of g.missiles) {
    ctx.save();
    ctx.translate(m.x, m.y);
    drawMissile(ctx, m.heading, m.trail);
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
  drawAbilities(ctx, g);
  if (g.boss && !g.boss.entering) drawBossBar(ctx, g);
}

/** Five pips showing how much of the burst is left, and the reload sweep. */
function drawBurstPips(ctx: CanvasRenderingContext2D, g: GameState): void {
  const left = burstLeft(g);
  const size = g.loadout.burstSize;
  const pip = 10;
  const gap = 4;
  for (let i = 0; i < size; i++) {
    const x = 12 + i * (pip + gap);
    const y = 64;
    ctx.fillStyle = i < left ? '#7ef9ff' : 'rgba(255,255,255,.18)';
    ctx.fillRect(x, y, pip, pip);
  }
  if (g.reloadLeft > 0) {
    const fraction = 1 - g.reloadLeft / g.loadout.reloadSeconds;
    const width = size * (pip + gap) - gap;
    ctx.fillStyle = 'rgba(255, 213, 79, .85)';
    ctx.fillRect(12, 76, width * fraction, 3);
    ctx.fillStyle = 'rgba(255, 213, 79, .9)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('reloading', 12 + width + 8, 64);
    ctx.font = '600 13px system-ui, sans-serif';
  }
}

/** Ability slots along the bottom: heal and missile, each with its own state. */
function drawAbilities(ctx: CanvasRenderingContext2D, g: GameState): void {
  const healCost = Math.ceil(g.loadout.maxAmmo * HEAL_AMMO_SHARE);
  const hurt = g.hull < MAX_HULL;
  const canAffordHeal = g.loadout.ammo >= healCost;
  const y = VIEW_HEIGHT - 46 - 48;

  drawSlot(ctx, {
    x: 12,
    y,
    key: 'H',
    label: 'HEAL',
    detail: !hurt ? 'hull full' : `${healCost} ammo`,
    ready: hurt && canAffordHeal,
    warn: hurt && !canAffordHeal,
    pulse: g.healFlash > 0 ? g.healFlash / 0.6 : 0,
    progress: 1,
    tint: '#7dffb0',
  });

  const missileReady = g.missileLeft === 0;
  drawSlot(ctx, {
    x: 138,
    y,
    key: 'M',
    label: 'MISSILE',
    detail: missileReady ? 'ready' : `${Math.ceil(g.missileLeft)}s`,
    ready: missileReady,
    warn: false,
    pulse: 0,
    progress: missileReady ? 1 : 1 - g.missileLeft / g.loadout.missileCooldown,
    tint: '#ffca57',
  });
}

interface SlotStyle {
  x: number;
  y: number;
  key: string;
  label: string;
  detail: string;
  ready: boolean;
  warn: boolean;
  pulse: number;
  /** 0 to 1, drawn as a filling bar while the ability recharges. */
  progress: number;
  tint: string;
}

function drawSlot(ctx: CanvasRenderingContext2D, s: SlotStyle): void {
  const w = 118;
  const h = 46;
  ctx.save();
  ctx.fillStyle = s.ready ? 'rgba(18, 32, 44, .9)' : 'rgba(12, 18, 28, .72)';
  ctx.strokeStyle = s.pulse > 0
    ? `rgba(255,255,255,${0.5 + s.pulse * 0.5})`
    : s.ready
      ? s.tint
      : 'rgba(255,255,255,.22)';
  ctx.lineWidth = s.ready ? 2 : 1.5;
  roundRect(ctx, s.x, s.y, w, h, 9);
  ctx.fill();
  ctx.stroke();

  if (s.progress < 1) {
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fillRect(s.x + 2, s.y + h - 6, (w - 4) * s.progress, 3);
  }

  ctx.fillStyle = s.ready ? s.tint : 'rgba(238,243,248,.5)';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillText(s.key, s.x + 11, s.y + 8);

  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(s.label, s.x + 32, s.y + 7);

  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = s.warn ? '#ff8a80' : 'rgba(238,243,248,.8)';
  ctx.fillText(s.detail, s.x + 32, s.y + 25);
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
  drawBurstPips(ctx, g);
  const skinBonus = currentSkin(g).damageBonus;
  ctx.fillText(`Cannons ${g.loadout.guns}   Damage ${g.loadout.damage + skinBonus}`, 12, 82);
  ctx.fillStyle = 'rgba(238,243,248,.65)';
  ctx.fillText(`Ammo drops ${Math.round(ammoDropChance(g) * 100)}%`, 12, 100);
  ctx.fillStyle = '#eef3f8';

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
