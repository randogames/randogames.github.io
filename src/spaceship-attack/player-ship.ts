import * as THREE from 'three';
import { buildPlayerShip } from './ships';
import type { Input } from './input';
import type { Mode } from './modes';
import type { Loadout } from './upgrades';
import type { Bullets } from './bullets';

const CRUISE_SPEED = 42;
const BOOST_SPEED = 85;
const STRAFE_SPEED = 26;
const CLIMB_SPEED = 18;
/** Adventure mode keeps the ship inside this box, measured from the lane centre. */
const LANE_HALF_WIDTH = 34;
const LANE_MIN_Y = 4;
const LANE_MAX_Y = 46;
export const MAX_HULL = 100;

export class PlayerShip {
  readonly group: THREE.Group;
  hull = MAX_HULL;
  /** Distance flown along the course, in metres. */
  distance = 0;
  boosting = false;
  private cooldown = 0;
  private hurtFlash = 0;

  constructor(scene: THREE.Scene, private readonly mode: Mode) {
    this.group = buildPlayerShip();
    this.group.position.set(0, 22, 0);
    scene.add(this.group);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** Unit vector the nose points along. */
  get forward(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, -1);
  }

  damage(amount: number): void {
    if (this.mode.invulnerable) return;
    this.hull = Math.max(0, this.hull - amount);
    this.hurtFlash = 0.25;
  }

  get dead(): boolean {
    return this.hull <= 0;
  }

  update(dt: number, input: Input, loadout: Loadout, bullets: Bullets): void {
    this.boosting = input.boosting;
    const speed = this.boosting ? BOOST_SPEED : CRUISE_SPEED;
    const step = speed * dt;
    this.position.z -= step;
    this.distance += step;

    this.position.x += input.steer * STRAFE_SPEED * dt;
    this.position.y += input.pitch * CLIMB_SPEED * dt;
    if (!this.mode.freeFlight) {
      this.position.x = THREE.MathUtils.clamp(this.position.x, -LANE_HALF_WIDTH, LANE_HALF_WIDTH);
      this.position.y = THREE.MathUtils.clamp(this.position.y, LANE_MIN_Y, LANE_MAX_Y);
    }

    // Bank into turns and tip the nose when climbing.
    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, -input.steer * 0.5, 1 - Math.exp(-dt * 8));
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -input.pitch * 0.25, 1 - Math.exp(-dt * 8));

    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.group.visible = this.hurtFlash > 0 ? Math.sin(this.hurtFlash * 60) > -0.4 : true;

    this.cooldown = Math.max(0, this.cooldown - dt);
    if (input.shooting && this.cooldown === 0 && loadout.ammo > 0) {
      this.fire(loadout, bullets);
    }
  }

  private fire(loadout: Loadout, bullets: Bullets): void {
    this.cooldown = loadout.fireDelay;
    if (Number.isFinite(loadout.ammo)) loadout.ammo -= 1;
    const spread = loadout.guns === 1 ? [0] : loadout.guns === 2 ? [-1.5, 1.5] : [-1.8, 0, 1.8];
    for (const offset of spread) {
      const from = this.position.clone().add(new THREE.Vector3(offset, 0, -1.8));
      bullets.spawn(from, this.forward, loadout.damage, false);
    }
  }
}
