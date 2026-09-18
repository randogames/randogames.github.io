import { clamp, VIEW_HEIGHT, VIEW_WIDTH } from './world';
import {
  MAX_HULL, PLAYER_RADIUS, hits, moveBullet, moveEnemy, movePickup, spawnEnemy,
  type Boss, type Bullet, type Enemy, type Explosion, type Pickup,
} from './entities';
import { FINAL_BOSS_TIER, bossDueAt, spawnBoss, updateBoss } from './bosses';
import { createLoadout, upgradeFor, AMMO_PER_KILL, type Loadout } from './upgrades';
import type { Mode } from './modes';
import type { Input } from './input';
import { skinFor, type Skin } from './skins';

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
  boss: Boss | null;
  bossesDefeated: number;
  won: boolean;
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
  killsSinceUpgrade: number;
  shotsFired: number;
  boosting: boolean;
  /** Seconds of play so far, used to ramp up how many ships appear. */
  elapsed: number;
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
    boss: null,
    bossesDefeated: 0,
    won: false,
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
    killsSinceUpgrade: 0,
    shotsFired: 0,
    boosting: false,
    elapsed: 0,
    tilt: 0,
    over: false,
    healFlash: 0,
    fireCooldown: 0,
    spawnTimer: 1,
    hurtFlash: 0,
  };
}

export type Notify = (message: string) => void;

/** Kill rate so far, used to pace the boss arrivals. */
export function killsPerMinute(g: GameState): number {
  return g.elapsed > 5 ? (g.kills / g.elapsed) * 60 : 0;
}

/** Seconds until the next boss shows up, or null once all five are beaten. */
export function secondsToNextBoss(g: GameState): number | null {
  const nextTier = g.bossesDefeated + 1;
  if (nextTier > FINAL_BOSS_TIER) return null;
  return Math.max(0, bossDueAt(nextTier, killsPerMinute(g)) - g.elapsed);
}

/** The ship skin earned so far. Each boss beaten unlocks the next one. */
export function currentSkin(g: GameState): Skin {
  return skinFor(g.bossesDefeated);
}

/** Damage a single bullet does right now, upgrades plus the skin bonus. */
export function shotDamage(g: GameState): number {
  return g.loadout.damage + currentSkin(g).damageBonus;
}

export function update(g: GameState, dt: number, input: Input, notify: Notify): void {
  if (g.over) return;

  g.elapsed += dt;
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

  // Bosses arrive on a timer and pause the regular waves while they live.
  if (g.mode.enemies && !g.boss) {
    const nextTier = g.bossesDefeated + 1;
    if (nextTier <= FINAL_BOSS_TIER && g.elapsed >= bossDueAt(nextTier, killsPerMinute(g))) {
      g.boss = spawnBoss(nextTier);
      notify(`${g.boss.name} incoming!`);
    }
  }

  if (g.mode.enemies && !g.boss) {
    g.spawnTimer -= dt;
    if (g.spawnTimer <= 0) {
      // Few ships to begin with, then steadily more as the run goes on.
      const minutes = g.elapsed / 60;
      g.spawnTimer = Math.max(0.4, 2.6 - minutes * 0.55);
      g.enemies.push(spawnEnemy(minutes));
    }
  }

  if (g.boss) updateBossFight(g, dt, notify);

  for (let i = g.enemies.length - 1; i >= 0; i--) {
    const e = g.enemies[i]!;
    if (!moveEnemy(e, dt)) {
      g.enemies.splice(i, 1);
      continue;
    }
    if (g.mode.enemiesAttack) {
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
    if (g.mode.enemiesAttack && hits(e, e.radius, g, PLAYER_RADIUS)) {
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

  if (g.won) return;

  if (g.hull <= 0 && !g.over) {
    g.over = true;
    g.explosions.push({ x: g.x, y: g.y, life: 0.8, maxLife: 0.8, size: 60 });
  }
}

/** Boss movement, its attacks, and the player's shots landing on it. */
function updateBossFight(g: GameState, dt: number, notify: Notify): void {
  const boss = g.boss;
  if (!boss) return;

  const launched = updateBoss(boss, dt, { x: g.x, y: g.y }, g.mode.enemiesAttack);
  g.bullets.push(...launched.bullets);
  g.enemies.push(...launched.minions);

  for (let b = g.bullets.length - 1; b >= 0; b--) {
    const bullet = g.bullets[b]!;
    if (bullet.hostile) continue;
    if (!hits(bullet, 3, boss, boss.radius)) continue;
    boss.hp -= bullet.damage;
    g.bullets.splice(b, 1);
    g.explosions.push({ x: bullet.x, y: bullet.y, life: 0.18, maxLife: 0.18, size: 14 });
  }

  if (g.mode.enemiesAttack && !boss.entering && hits(boss, boss.radius, g, PLAYER_RADIUS)) damage(g, 25);

  if (boss.hp > 0) return;

  g.score += boss.scoreValue;
  g.bossesDefeated += 1;
  g.boss = null;
  for (let i = 0; i < 6; i++) {
    g.explosions.push({
      x: boss.x + (Math.random() - 0.5) * boss.radius * 1.5,
      y: boss.y + (Math.random() - 0.5) * boss.radius * 1.5,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1,
      size: boss.radius * 1.6,
    });
  }
  g.loadout.ammo = g.loadout.maxAmmo;
  grantUpgrade(g, notify);
  const skin = skinFor(g.bossesDefeated);
  notify(`${boss.name} destroyed! New ship: ${skin.name}.`);
  if (g.bossesDefeated >= FINAL_BOSS_TIER) {
    g.won = true;
    notify('The fleet is broken. You win!');
  }
}

function fire(g: GameState, notify: Notify): void {
  g.fireCooldown = g.loadout.fireDelay;
  g.loadout.ammo -= 1;
  g.shotsFired += 1;
  // Extra cannons fire straight up in close parallel lines, never fanned out.
  const offsets = g.loadout.guns === 1 ? [0] : g.loadout.guns === 2 ? [-4, 4] : [-7, 0, 7];
  const damage = g.loadout.damage + skinFor(g.bossesDefeated).damageBonus;
  for (const dx of offsets) {
    g.bullets.push({ x: g.x + dx, y: g.y - 18, vx: 0, vy: -BULLET_SPEED, damage, hostile: false });
  }
  const per = g.mode.shotsPerUpgrade;
  if (per !== null && g.shotsFired % per === 0) grantUpgrade(g, notify);
}

/** Heal ability: spends a fifth of the full magazine to restore the hull to full. */
function heal(g: GameState, notify: Notify): void {
  const cost = Math.ceil(g.loadout.maxAmmo * HEAL_AMMO_SHARE);
  if (g.hull >= MAX_HULL) {
    notify('Hull is already full.');
    return;
  }
  if (g.loadout.ammo < cost) {
    notify(`Healing needs ${cost} ammo. You have ${g.loadout.ammo}.`);
    return;
  }
  g.loadout.ammo -= cost;
  g.hull = MAX_HULL;
  g.healFlash = 0.6;
  notify(`Healed to full hull. Spent ${cost} ammo.`);
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
  // A 40% chance per kill, plus a guaranteed one every fifth kill so a run of
  // bad luck cannot leave the ship un-upgraded.
  g.killsSinceUpgrade += 1;
  const guaranteed = g.killsSinceUpgrade >= g.mode.killsPerGuaranteedUpgrade;
  if (guaranteed || Math.random() < g.mode.upgradeChance) grantUpgrade(g, notify);
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

export function grantUpgrade(g: GameState, notify: Notify): void {
  g.killsSinceUpgrade = 0;
  const upgrade = upgradeFor(g.upgradesEarned);
  upgrade.apply(g.loadout);
  g.upgradesEarned += 1;
  notify(`Upgrade: ${upgrade.name}`);
}
