import { clamp, VIEW_HEIGHT, VIEW_WIDTH } from './world';
import {
  MAX_HULL, PLAYER_RADIUS, hits, moveBullet, moveEnemy, movePickup, spawnEnemy,
  type Bullet, type Enemy, type Explosion, type Pickup,
} from './entities';
import { createLoadout, upgradeFor, AMMO_PER_KILL, type Loadout } from './upgrades';
import type { Mode } from './modes';
import type { Input } from './input';

const STRAFE_SPEED = 300;
const CLIMB_SPEED = 220;
const BOOST_FACTOR = 2.1;
/** How far above the bottom the ship can climb. Both modes roam the full width. */
const BULLET_SPEED = 620;
const ENEMY_BULLET_SPEED = 260;
const ADVENTURE_TOP = VIEW_HEIGHT * 0.3;
/** Ammo always drops from a kill, as a tight cluster of two or three crates. */
const PICKUP_CLUSTER_MIN = 2;
const PICKUP_CLUSTER_MAX = 3;
const PICKUP_CLUSTER_SPREAD = 11;
const PICKUP_AMMO = 8;
/** Repairing spends this share of the full magazine and refills the hull. */
export const HEAL_AMMO_SHARE = 0.2;

export interface GameState {
  readonly mode: Mode;
  readonly loadout: Loadout;
  readonly bullets: Bullet[];
  readonly enemies: Enemy[];
  readonly pickups: Pickup[];
  readonly explosions: Explosion[];
  x: number;
  y: number;
  hull: number;
  kills: number;
  score: number;
  /** Metres flown, used for the distance readout and difficulty. */
  distance: number;
  upgradesEarned: number;
  shotsFired: number;
  boosting: boolean;
  tilt: number;
  over: boolean;
  /** Counts up while the repair glow is showing. */
  healFlash: number;
  fireCooldown: number;
  spawnTimer: number;
  hurtFlash: number;
}

export function createGame(mode: Mode): GameState {
  return {
    mode,
    loadout: createLoadout(mode.startAmmo, mode.maxAmmo),
    bullets: [],
    enemies: [],
    pickups: [],
    explosions: [],
    x: VIEW_WIDTH / 2,
    y: VIEW_HEIGHT - 90,
    hull: MAX_HULL,
    kills: 0,
    score: 0,
    distance: 0,
    upgradesEarned: 0,
    shotsFired: 0,
    boosting: false,
    tilt: 0,
    over: false,
    healFlash: 0,
    fireCooldown: 0,
    spawnTimer: 1,
    hurtFlash: 0,
  };
}

export type Notify = (message: string) => void;

export function update(g: GameState, dt: number, input: Input, notify: Notify): void {
  if (g.over) return;

  g.boosting = input.boosting;
  const boost = g.boosting ? BOOST_FACTOR : 1;
  g.distance += 40 * boost * dt;

  const steer = input.steer;
  g.x = clamp(g.x + steer * STRAFE_SPEED * boost * dt, PLAYER_RADIUS, VIEW_WIDTH - PLAYER_RADIUS);
  g.tilt += (steer - g.tilt) * Math.min(1, dt * 9);

  const top = g.mode.invulnerable ? PLAYER_RADIUS : ADVENTURE_TOP;
  g.y = clamp(g.y - input.pitch * CLIMB_SPEED * dt, top, VIEW_HEIGHT - PLAYER_RADIUS);

  g.hurtFlash = Math.max(0, g.hurtFlash - dt);
  g.healFlash = Math.max(0, g.healFlash - dt);
  if (input.healPressed) heal(g, notify);
  g.fireCooldown = Math.max(0, g.fireCooldown - dt);
  if (input.firePressed && g.fireCooldown === 0 && g.loadout.ammo > 0) fire(g, notify);

  for (let i = g.bullets.length - 1; i >= 0; i--) {
    if (!moveBullet(g.bullets[i]!, dt)) g.bullets.splice(i, 1);
  }

  if (g.mode.enemies) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      const difficulty = g.distance / 500;
      g.spawnTimer = Math.max(0.35, 1.5 - difficulty * 0.06);
      g.enemies.push(spawnEnemy(difficulty));
    }
  }

  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i]!;
    if (!moveEnemy(e, dt)) {
      g.enemies.splice(i, 1);
      continue;
    }
    if (g.mode.enemies) {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = 1.4 + Math.random() * 1.8;
        const dx = g.x - e.x;
        const dy = g.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        g.bullets.push({
          x: e.x, y: e.y + e.radius,
          vx: (dx / len) * ENEMY_BULLET_SPEED,
          vy: (dy / len) * ENEMY_BULLET_SPEED,
          damage: 8, hostile: true,
        });
      }
    }

    // Player shots hitting this enemy.
    let killed = false;
    for (let b = g.bullets.length - 1; b >= 0; b--) {
      const bullet = g.bullets[b]!;
      if (bullet.hostile) continue;
      if (!hits(bullet, 3, e, e.radius)) continue;
      e.hp -= bullet.damage;
      g.bullets.splice(b, 1);
      if (e.hp <= 0) {
        killed = true;
        break;
      }
    }
    if (killed) {
      awardKill(g, e, notify);
      g.enemies.splice(i, 1);
      continue;
    }

    // Ramming the player.
    if (g.mode.enemies && hits(e, e.radius, g, PLAYER_RADIUS)) {
      damage(g, 20);
      g.explosions.push({ x: e.x, y: e.y, life: 0.5, maxLife: 0.5, size: e.radius * 2 });
      g.enemies.splice(i, 1);
    }
  }

  // Enemy shots hitting the player.
  for (let b = g.bullets.length - 1; b >= 0; b--) {
    const bullet = g.bullets[b]!;
    if (!bullet.hostile) continue;
    if (!hits(bullet, 3, g, PLAYER_RADIUS)) continue;
    damage(g, bullet.damage);
    g.bullets.splice(b, 1);
  }

  for (let i = g.pickups.length - 1; i >= 0; i--) {
    const p = g.pickups[i]!;
    if (!movePickup(p, dt)) {
      g.pickups.splice(i, 1);
      continue;
    }
    if (hits(p, 11, g, PLAYER_RADIUS)) {
      g.loadout.ammo = Math.min(g.loadout.maxAmmo, g.loadout.ammo + p.amount);
      notify(`+${p.amount} ammo`);
      g.pickups.splice(i, 1);
    }
  }

  for (let i = g.explosions.length - 1; i >= 0; i--) {
    const x = g.explosions[i]!;
    x.life -= dt;
    if (x.life <= 0) g.explosions.splice(i, 1);
  }

  if (g.hull <= 0 && !g.over) {
    g.over = true;
    g.explosions.push({ x: g.x, y: g.y, life: 0.8, maxLife: 0.8, size: 60 });
  }
}

function fire(g: GameState, notify: Notify): void {
  g.fireCooldown = g.loadout.fireDelay;
  g.loadout.ammo -= 1;
  g.shotsFired += 1;
  const offsets = g.loadout.guns === 1 ? [0] : g.loadout.guns === 2 ? [-9, 9] : [-13, 0, 13];
  const spread = (g.loadout.spread * Math.PI) / 180;
  offsets.forEach((dx, i) => {
    // Fan the volley out from the centre when the spread upgrade is earned.
    const centred = offsets.length === 1 ? 0 : i / (offsets.length - 1) - 0.5;
    const angle = centred * spread * 2;
    g.bullets.push({
      x: g.x + dx,
      y: g.y - 18,
      vx: Math.sin(angle) * BULLET_SPEED,
      vy: -Math.cos(angle) * BULLET_SPEED,
      damage: g.loadout.damage,
      hostile: false,
    });
  });
  const per = g.mode.shotsPerUpgrade;
  if (per !== null && g.shotsFired % per === 0) grantUpgrade(g, notify);
}

/** Spends a fifth of the full magazine to bring the hull back to full. */
function heal(g: GameState, notify: Notify): void {
  const cost = Math.ceil(g.loadout.maxAmmo * HEAL_AMMO_SHARE);
  if (g.hull >= MAX_HULL) {
    notify('Hull is already full.');
    return;
  }
  if (g.loadout.ammo < cost) {
    notify(`Repair needs ${cost} ammo. You have ${g.loadout.ammo}.`);
    return;
  }
  g.loadout.ammo -= cost;
  g.hull = MAX_HULL;
  g.healFlash = 0.6;
  notify(`Hull repaired. Spent ${cost} ammo.`);
}

function damage(g: GameState, amount: number): void {
  if (g.mode.invulnerable) return;
  g.hull = Math.max(0, g.hull - amount);
  g.hurtFlash = 0.3;
}

function awardKill(g: GameState, e: Enemy, notify: Notify): void {
  g.kills += 1;
  g.score += e.scoreValue * 10;
  g.explosions.push({ x: e.x, y: e.y, life: 0.45, maxLife: 0.45, size: e.radius * 2.4 });
  g.loadout.ammo = Math.min(g.loadout.maxAmmo, g.loadout.ammo + AMMO_PER_KILL);
  dropAmmoCluster(g, e.x, e.y);
  if (Math.random() < g.mode.upgradeChance) grantUpgrade(g, notify);
}

/** Two or three ammo crates that fall together, close enough to scoop up in one pass. */
function dropAmmoCluster(g: GameState, x: number, y: number): void {
  const count = PICKUP_CLUSTER_MIN + Math.floor(Math.random() * (PICKUP_CLUSTER_MAX - PICKUP_CLUSTER_MIN + 1));
  const fall = 90 + Math.random() * 20;
  for (let i = 0; i < count; i++) {
    const centred = count === 1 ? 0 : i / (count - 1) - 0.5;
    g.pickups.push({
      kind: 'ammo',
      amount: PICKUP_AMMO,
      x: clamp(x + centred * PICKUP_CLUSTER_SPREAD * 2, 12, VIEW_WIDTH - 12),
      y: y + centred * 6,
      vy: fall,
      pulse: i * 0.6,
    });
  }
}

function grantUpgrade(g: GameState, notify: Notify): void {
  const upgrade = upgradeFor(g.upgradesEarned);
  upgrade.apply(g.loadout);
  g.upgradesEarned += 1;
  notify(`Upgrade: ${upgrade.name}`);
}
