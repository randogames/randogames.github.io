import { VIEW_WIDTH, clamp } from './world';
import { spawnEnemy, type Boss, type Bullet, type Enemy } from './entities';

/** A boss arrives every 5000 points; beating the fifth one wins the game. */
export const BOSS_SCORE_STEP = 5000;
export const FINAL_BOSS_TIER = 5;
export const WIN_SCORE = BOSS_SCORE_STEP * FINAL_BOSS_TIER;

interface BossKind {
  readonly name: string;
  readonly hp: number;
  readonly radius: number;
  readonly color: string;
  readonly speed: number;
  readonly fireEvery: number;
  /** How it attacks: a fan of shots, an aimed burst, or launching small ships. */
  readonly attack: 'fan' | 'aimed' | 'hive' | 'sweep' | 'storm';
}

/**
 * Hit points are counted in plain, un-upgraded bullets: 50, 100, 200, 400, 800.
 * Upgrades and skins make each press hit harder, so later bosses stay winnable.
 */
export const BOSS_KINDS: readonly BossKind[] = [
  { name: 'Sentinel', hp: 50, radius: 42, color: '#7f8c8d', speed: 55, fireEvery: 1.6, attack: 'fan' },
  { name: 'Hive Mother', hp: 100, radius: 46, color: '#27ae60', speed: 45, fireEvery: 2.2, attack: 'hive' },
  { name: 'Lancer', hp: 200, radius: 38, color: '#2980b9', speed: 120, fireEvery: 1.1, attack: 'aimed' },
  { name: 'Fortress', hp: 400, radius: 54, color: '#8e44ad', speed: 35, fireEvery: 1.4, attack: 'sweep' },
  { name: 'Dreadnought', hp: 800, radius: 58, color: '#c0392b', speed: 70, fireEvery: 0.9, attack: 'storm' },
];

export function bossKind(tier: number): BossKind {
  return BOSS_KINDS[clamp(tier - 1, 0, BOSS_KINDS.length - 1)]!;
}

export function spawnBoss(tier: number): Boss {
  const kind = bossKind(tier);
  return {
    tier,
    name: kind.name,
    x: VIEW_WIDTH / 2,
    y: -kind.radius,
    hp: kind.hp,
    maxHp: kind.hp,
    radius: kind.radius,
    color: kind.color,
    scoreValue: 500 * tier,
    vx: kind.speed,
    phase: 0,
    fireTimer: 1.2,
    entering: true,
  };
}

export interface BossAttack {
  readonly bullets: Bullet[];
  readonly minions: Enemy[];
}

/** Moves the boss and returns whatever it launched this frame. */
export function updateBoss(
  boss: Boss,
  dt: number,
  target: { x: number; y: number },
  hostile: boolean,
): BossAttack {
  const kind = bossKind(boss.tier);
  boss.phase += dt;

  const restY = boss.radius + 24;
  if (boss.entering) {
    boss.y = Math.min(restY, boss.y + 60 * dt);
    if (boss.y >= restY) boss.entering = false;
    return { bullets: [], minions: [] };
  }

  boss.x += boss.vx * dt;
  if (boss.x < boss.radius || boss.x > VIEW_WIDTH - boss.radius) {
    boss.vx *= -1;
    boss.x = clamp(boss.x, boss.radius, VIEW_WIDTH - boss.radius);
  }
  boss.y = restY + Math.sin(boss.phase * 1.3) * 12;

  const bullets: Bullet[] = [];
  const minions: Enemy[] = [];
  if (!hostile) return { bullets, minions };

  boss.fireTimer -= dt;
  if (boss.fireTimer > 0) return { bullets, minions };
  boss.fireTimer = kind.fireEvery;

  const speed = 230;
  const shoot = (angle: number, damage = 9): void => {
    bullets.push({
      x: boss.x,
      y: boss.y + boss.radius * 0.5,
      vx: Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
      damage,
      hostile: true,
    });
  };
  const aimAngle = Math.atan2(target.x - boss.x, target.y - boss.y);

  switch (kind.attack) {
    case 'fan':
      for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) shoot(a);
      break;
    case 'aimed':
      for (const a of [-0.12, 0, 0.12]) shoot(aimAngle + a, 11);
      break;
    case 'hive': {
      const minion = spawnEnemy(0);
      minion.x = boss.x;
      minion.y = boss.y + boss.radius * 0.4;
      minions.push(minion);
      shoot(aimAngle);
      break;
    }
    case 'sweep': {
      // A rotating spoke pattern that sweeps the screen.
      const base = boss.phase * 1.1;
      for (let i = 0; i < 6; i++) shoot(base + (i / 6) * Math.PI * 2, 8);
      break;
    }
    case 'storm': {
      for (const a of [-0.6, -0.3, 0, 0.3, 0.6]) shoot(a, 10);
      for (const a of [-0.15, 0.15]) shoot(aimAngle + a, 12);
      if (Math.random() < 0.5) {
        const minion = spawnEnemy(0);
        minion.x = boss.x + (Math.random() - 0.5) * boss.radius;
        minion.y = boss.y + boss.radius * 0.4;
        minions.push(minion);
      }
      break;
    }
  }
  return { bullets, minions };
}
