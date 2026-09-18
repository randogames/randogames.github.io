import { clamp, VIEW_HEIGHT, VIEW_WIDTH } from './world';
import {
  MAX_HULL, PLAYER_RADIUS, hits, moveBullet, moveEnemy, movePickup, spawnEnemy,
  type Boss, type Bullet, type Enemy, type Explosion, type Pickup,
} from './entities';
import { FINAL_BOSS_TIER, bossDueAt, spawnBoss, updateBoss } from './bosses';
import { createLoadout, upgradeFor, type Loadout } from './upgrades';
import { moveMissile, spawnMissile, type Missile, type MissileTarget } from './missiles';
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
/** Ammo drops as a tight cluster of two or three crates. */
const PICKUP_CLUSTER_MIN = 2;
const PICKUP_CLUSTER_MAX = 3;
const PICKUP_CLUSTER_SPREAD = 11;

/**
 * Salvage dries up as a run goes on. Early kills nearly always drop a generous
 * pile of ammo; by the time the decay is complete only one kill in five drops
 * anything, and it is a small amount.
 */
const AMMO_DECAY_SECONDS = 480;
const EARLY_DROP_CHANCE = 1;
const LATE_DROP_CHANCE = 0.2;
const EARLY_DROP_AMMO = 20;
const LATE_DROP_AMMO = 6;

/** Missiles hit for several times a bullet. */
const MISSILE_DAMAGE_FACTOR = 4;
const MISSILE_BLAST_RADIUS = 26;
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
  readonly missiles: Missile[];
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
  /** Seconds of play so far, used to ramp up how many ships appear. */
  elapsed: number;
  tilt: number;
  over: boolean;
  /** Counts up while the repair glow is showing. */
  healFlash: number;
  fireCooldown: number;
  /** Shots used from the current burst. */
  burstUsed: number;
  /** Seconds left of the post-burst reload, 0 when ready. */
  reloadLeft: number;
  /** Seconds left before the next missile can launch. */
  missileLeft: number;
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
    missiles: [],
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
    elapsed: 0,
    tilt: 0,
    over: false,
    healFlash: 0,
    fireCooldown: 0,
    burstUsed: 0,
    reloadLeft: 0,
    missileLeft: 0,
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
  g.missileLeft = Math.max(0, g.missileLeft - dt);
  if (g.reloadLeft > 0) {
    g.reloadLeft = Math.max(0, g.reloadLeft - dt);
    if (g.reloadLeft === 0) g.burstUsed = 0;
  }
  if (input.firePressed && canFire(g)) fire(g, notify);
  if (input.missilePressed) launchMissile(g, notify);

  for (let i = g.bullets.length - 1; i >= 0; i--) {
    if (!moveBullet(g.bullets[i]!, dt)) g.bullets.splice(i, 1);
  }

  updateMissiles(g, dt, notify);

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
  g.burstUsed = 0;
  g.reloadLeft = 0;
  grantUpgrade(g, notify);
  const skin = skinFor(g.bossesDefeated);
  notify(`${boss.name} destroyed! Ammo refilled, ship is now ${skin.name}.`);
  if (g.bossesDefeated >= FINAL_BOSS_TIER) {
    g.won = true;
    notify('The fleet is broken. You win!');
  }
}

/** The gun is ready when it is not reloading and not between shots in a burst. */
export function canFire(g: GameState): boolean {
  return g.reloadLeft === 0 && g.fireCooldown === 0 && g.loadout.ammo > 0;
}

/** Shots left in the current burst before the gun has to cool down. */
export function burstLeft(g: GameState): number {
  return Math.max(0, g.loadout.burstSize - g.burstUsed);
}

function fire(g: GameState, notify: Notify): void {
  g.fireCooldown = g.loadout.fireDelay;
  g.loadout.ammo -= 1;
  g.shotsFired += 1;
  g.burstUsed += 1;
  if (g.burstUsed >= g.loadout.burstSize) g.reloadLeft = g.loadout.reloadSeconds;
  // Extra cannons fire straight up in close parallel lines, never fanned out.
  const offsets = g.loadout.guns === 1 ? [0] : g.loadout.guns === 2 ? [-4, 4] : [-7, 0, 7];
  const damage = g.loadout.damage + skinFor(g.bossesDefeated).damageBonus;
  for (const dx of offsets) {
    g.bullets.push({ x: g.x + dx, y: g.y - 18, vx: 0, vy: -BULLET_SPEED, damage, hostile: false });
  }
}

/** Homing missile on its own timer, independent of the gun. */
function launchMissile(g: GameState, notify: Notify): void {
  if (g.missileLeft > 0) {
    notify(`Missile ready in ${Math.ceil(g.missileLeft)}s.`);
    return;
  }
  g.missileLeft = g.loadout.missileCooldown;
  g.missiles.push(spawnMissile(g.x, g.y - 18, shotDamage(g) * MISSILE_DAMAGE_FACTOR));
}

/** The enemy or boss nearest a point, for missile guidance. */
export function nearestTarget(g: GameState, from: { x: number; y: number }): MissileTarget | null {
  let best: MissileTarget | null = null;
  let bestDist = Infinity;
  const consider = (t: MissileTarget): void => {
    const d = Math.hypot(t.x - from.x, t.y - from.y);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  };
  for (const e of g.enemies) consider(e);
  if (g.boss && !g.boss.entering) consider(g.boss);
  return best;
}

function updateMissiles(g: GameState, dt: number, notify: Notify): void {
  for (let i = g.missiles.length - 1; i >= 0; i--) {
    const m = g.missiles[i]!;
    const target = nearestTarget(g, m);
    if (!moveMissile(m, dt, target)) {
      g.missiles.splice(i, 1);
      continue;
    }
    if (!target) continue;
    if (Math.hypot(target.x - m.x, target.y - m.y) > target.radius + 6) continue;

    // Detonate: full damage to what it struck, half to anything else close by.
    g.explosions.push({ x: m.x, y: m.y, life: 0.4, maxLife: 0.4, size: MISSILE_BLAST_RADIUS * 1.6 });
    if (g.boss && target === g.boss) {
      g.boss.hp -= m.damage;
    } else {
      hurtEnemy(g, target as Enemy, m.damage, notify);
    }
    const splash = Math.ceil(m.damage / 2);
    for (let e = g.enemies.length - 1; e >= 0; e--) {
      const enemy = g.enemies[e]!;
      if (enemy === target) continue;
      if (Math.hypot(enemy.x - m.x, enemy.y - m.y) <= MISSILE_BLAST_RADIUS + enemy.radius) {
        hurtEnemy(g, enemy, splash, notify);
      }
    }
    g.missiles.splice(i, 1);
  }
}

/** Takes hit points off an enemy, scoring the kill and removing it if it dies. */
function hurtEnemy(g: GameState, enemy: Enemy, amount: number, notify: Notify): void {
  const index = g.enemies.indexOf(enemy);
  if (index === -1) return;
  enemy.hp -= amount;
  if (enemy.hp > 0) return;
  awardKill(g, enemy, notify);
  g.enemies.splice(index, 1);
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
  // Upgrades come only from bosses now, so a kill just maybe drops ammo.
  if (Math.random() < ammoDropChance(g)) dropAmmoCluster(g, e.x, e.y);
}

/** Chance a kill drops ammo at all, falling from certain to one in five. */
export function ammoDropChance(g: GameState): number {
  const t = Math.min(1, g.elapsed / AMMO_DECAY_SECONDS);
  return EARLY_DROP_CHANCE + (LATE_DROP_CHANCE - EARLY_DROP_CHANCE) * t;
}

/** Ammo in a drop, falling as the run goes on. */
export function ammoDropAmount(g: GameState): number {
  const t = Math.min(1, g.elapsed / AMMO_DECAY_SECONDS);
  return Math.round(EARLY_DROP_AMMO + (LATE_DROP_AMMO - EARLY_DROP_AMMO) * t);
}

/** Two or three ammo crates that fall together, close enough to scoop up in one pass. */
function dropAmmoCluster(g: GameState, x: number, y: number): void {
  const count = PICKUP_CLUSTER_MIN + Math.floor(Math.random() * (PICKUP_CLUSTER_MAX - PICKUP_CLUSTER_MIN + 1));
  const fall = 90 + Math.random() * 20;
  const total = ammoDropAmount(g);
  for (let i = 0; i < count; i++) {
    const centred = count === 1 ? 0 : i / (count - 1) - 0.5;
    // The cluster shares the drop between its crates, biggest first.
    const share = i === 0 ? total - Math.floor(total / count) * (count - 1) : Math.floor(total / count);
    g.pickups.push({
      kind: 'ammo',
      amount: Math.max(1, share),
      x: clamp(x + centred * PICKUP_CLUSTER_SPREAD * 2, 12, VIEW_WIDTH - 12),
      y: y + centred * 6,
      vy: fall,
      pulse: i * 0.6,
    });
  }
}

export function grantUpgrade(g: GameState, notify: Notify): void {
  const upgrade = upgradeFor(g.upgradesEarned);
  upgrade.apply(g.loadout);
  g.upgradesEarned += 1;
  notify(`Upgrade: ${upgrade.name}`);
}
