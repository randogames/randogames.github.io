import type { Vec2 } from './world';

const SPEED = 330;
const TURN_RATE = 4.2; // radians per second
const LIFETIME = 4;

export interface Missile extends Vec2 {
  /** Direction of travel in radians, 0 pointing up the screen. */
  heading: number;
  damage: number;
  life: number;
  trail: number;
}

export interface MissileTarget extends Vec2 {
  readonly radius: number;
}

export function spawnMissile(x: number, y: number, damage: number): Missile {
  return { x, y, heading: 0, damage, life: LIFETIME, trail: 0 };
}

/** Steers the missile toward its target and moves it. Returns false when it expires. */
export function moveMissile(m: Missile, dt: number, target: MissileTarget | null): boolean {
  if (target) {
    const wanted = Math.atan2(target.x - m.x, m.y - target.y);
    let diff = wanted - m.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    m.heading += Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, diff));
  }
  m.x += Math.sin(m.heading) * SPEED * dt;
  m.y -= Math.cos(m.heading) * SPEED * dt;
  m.life -= dt;
  m.trail += dt;
  return m.life > 0 && m.y > -30 && m.x > -30 && m.x < 520;
}
