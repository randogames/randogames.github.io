import { clamp, overlaps, VIEW_HEIGHT, VIEW_WIDTH, type Vec2 } from './world';
import type { EnemyShape } from './sprites';

export const PLAYER_RADIUS = 13;
export const MAX_HULL = 100;

export interface Bullet extends Vec2 {
  vx: number;
  vy: number;
  damage: number;
  hostile: boolean;
}

export interface Enemy extends Vec2 {
  readonly shape: EnemyShape;
  readonly radius: number;
  readonly scoreValue: number;
  hp: number;
  vx: number;
  vy: number;
  fireTimer: number;
  spin: number;
  spinRate: number;
}

export interface Boss extends Vec2 {
  readonly tier: number;
  readonly name: string;
  readonly maxHp: number;
  readonly radius: number;
  readonly color: string;
  readonly scoreValue: number;
  hp: number;
  vx: number;
  phase: number;
  fireTimer: number;
  entering: boolean;
}

export interface Pickup extends Vec2 {
  readonly kind: 'ammo';
  readonly amount: number;
  vy: number;
  pulse: number;
}

export interface Explosion extends Vec2 {
  life: number;
  readonly maxLife: number;
  readonly size: number;
}

/**
 * Hit points are shot counts with the starting cannon: purple scouts take two,
 * red brutes take three, and teal darters go down in one.
 */
const ENEMY_TYPES: Record<EnemyShape, { hp: number; radius: number; speed: number; fireEvery: number; score: number }> = {
  scout: { hp: 2, radius: 13, speed: 70, fireEvery: 2.2, score: 50 },
  brute: { hp: 3, radius: 19, speed: 42, fireEvery: 1.7, score: 150 },
  darter: { hp: 1, radius: 11, speed: 130, fireEvery: 3.2, score: 80 },
};

export function spawnEnemy(difficulty: number): Enemy {
  const roll = Math.random();
  const shape: EnemyShape = roll < 0.55 ? 'scout' : roll < 0.8 ? 'darter' : 'brute';
  const type = ENEMY_TYPES[shape];
  return {
    shape,
    x: 30 + Math.random() * (VIEW_WIDTH - 60),
    y: -30,
    radius: type.radius,
    // Shot counts stay fixed; difficulty adds more ships, not tougher ones.
    hp: type.hp,
    scoreValue: type.score,
    vx: (Math.random() - 0.5) * 50,
    vy: type.speed * (1 + difficulty * 0.04),
    fireTimer: 0.6 + Math.random() * type.fireEvery,
    spin: 0,
    spinRate: shape === 'darter' ? 0 : (Math.random() - 0.5) * 1.2,
  };
}

/** Moves an enemy, bouncing it off the side walls. Returns false once it leaves the bottom. */
export function moveEnemy(e: Enemy, dt: number): boolean {
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.spin += e.spinRate * dt;
  if (e.x < e.radius || e.x > VIEW_WIDTH - e.radius) {
    e.vx *= -1;
    e.x = clamp(e.x, e.radius, VIEW_WIDTH - e.radius);
  }
  return e.y < VIEW_HEIGHT + 40;
}

export function moveBullet(b: Bullet, dt: number): boolean {
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  return b.y > -20 && b.y < VIEW_HEIGHT + 20 && b.x > -20 && b.x < VIEW_WIDTH + 20;
}

export function movePickup(p: Pickup, dt: number): boolean {
  p.y += p.vy * dt;
  p.pulse += dt * 3;
  return p.y < VIEW_HEIGHT + 20;
}

export function hits(a: Vec2, aRadius: number, b: Vec2, bRadius: number): boolean {
  return overlaps(a, aRadius, b, bRadius);
}
