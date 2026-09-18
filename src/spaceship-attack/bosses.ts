import { VIEW_WIDTH, clamp } from './world';
import { spawnEnemy, type Boss, type Bullet, type Enemy } from './entities';

/** How many bosses a full run contains. Beating the last one wins. */
export const FINAL_BOSS_TIER = 12;

/** The first boss shows up around here, then roughly one a minute. */
const FIRST_BOSS_SECONDS = 60;
const BOSS_INTERVAL_SECONDS = 60;
/** How much doing well or badly can shift a boss's arrival. */
const PACE_SWING_SECONDS = 12;
const FAST_KILLS_PER_MINUTE = 26;
const SLOW_KILLS_PER_MINUTE = 10;

/**
 * When the next boss is due, in seconds of play. A player racking up kills
 * quickly meets it sooner; someone struggling gets extra time.
 */
export function bossDueAt(tier: number, killsPerMinute: number): number {
  const base = FIRST_BOSS_SECONDS + (tier - 1) * BOSS_INTERVAL_SECONDS;
  const pace = clamp(
    (killsPerMinute - SLOW_KILLS_PER_MINUTE) / (FAST_KILLS_PER_MINUTE - SLOW_KILLS_PER_MINUTE),
    0,
    1,
  );
  // pace 1 (doing well) pulls the boss earlier, pace 0 pushes it later.
  return base + (0.5 - pace) * 2 * PACE_SWING_SECONDS;
}

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
 * The roster cycles as the run goes on, so a twelve boss run keeps varying its
 * attacks. Each boss is deliberately modest: the strength comes from how many
 * of them there are, not from any single one being a wall.
 */
export const BOSS_KINDS: readonly BossKind[] = [
  { name: 'Sentinel', hp: 30, radius: 40, color: '#7f8c8d', speed: 55, fireEvery: 1.8, attack: 'fan' },
  { name: 'Hive Mother', hp: 34, radius: 44, color: '#27ae60', speed: 45, fireEvery: 2.4, attack: 'hive' },
  { name: 'Lancer', hp: 30, radius: 36, color: '#2980b9', speed: 120, fireEvery: 1.3, attack: 'aimed' },
  { name: 'Fortress', hp: 40, radius: 50, color: '#8e44ad', speed: 35, fireEvery: 1.6, attack: 'sweep' },
  { name: 'Dreadnought', hp: 44, radius: 54, color: '#c0392b', speed: 70, fireEvery: 1.1, attack: 'storm' },
];

/** Later bosses in the run are a little tougher than the same kind was earlier. */
const HP_PER_TIER = 22;

export function bossKind(tier: number): BossKind {
  const index = (Math.max(1, tier) - 1) % BOSS_KINDS.length;
  return BOSS_KINDS[index]!;
}

/** Hit points in plain, un-upgraded bullets. */
export function bossHp(tier: number): number {
  return bossKind(tier).hp + (tier - 1) * HP_PER_TIER;
}

/** The roster repeats, so later passes are marked: Sentinel, then Sentinel II. */
export function bossName(tier: number): string {
  const pass = Math.floor((tier - 1) / BOSS_KINDS.length);
  const suffix = pass === 0 ? '' : ` ${'I'.repeat(pass + 1)}`;
  return `${bossKind(tier).name}${suffix}`;
}

export function spawnBoss(tier: number): Boss {
  const kind = bossKind(tier);
  const hp = bossHp(tier);
  return {
    tier,
    name: bossName(tier),
    x: VIEW_WIDTH / 2,
    y: -kind.radius,
    hp,
    maxHp: hp,
    radius: kind.radius,
    color: kind.color,
    scoreValue: 300 * tier,
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
