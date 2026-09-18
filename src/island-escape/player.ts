import * as THREE from 'three';
import type { Input } from './input';
import type { World } from './world';
import type { Boat } from './boat';
import { buildHuman, poseHuman, type Human } from './human';
import { buildTool, type ToolKind } from './tools';
import type { Mode } from './modes';

const WALK_SPEED = 8;
const SNEAK_SPEED = 3;
const SWIM_SPEED = 4;
const JUMP_SPEED = 8;
const GRAVITY = 22;
const HIP = 0.8; // hips above the ground
const SWIM_Y = 0.35;
export const SWIM_LIMIT = 10;
export const MAX_HP = 100;
export const MAX_HUNGER = 100;
const HUNGER_IDLE = 0.12; // per second
const HUNGER_WALK = 0.55;
const HUNGER_SWIM = 1.1;
const STARVE_DAMAGE = 3; // hp per second at zero hunger
const FLY_SPEED = 12; // creative mode, holding Space
const REGEN_HUNGER = 80; // hunger needed before health regenerates
const REGEN_RATE = 4; // hp per second at full hunger

export type Notify = (message: string) => void;

export class Player {
  readonly group: THREE.Group;
  hp = MAX_HP;
  hunger = MAX_HUNGER;
  swimTime = 0;
  boat: Boat | null = null;
  heading = Math.PI;
  private readonly human: Human;
  private vy = 0;
  private grounded = true;
  private swing = 0;
  private walk = 0;
  private flying = false;
  private toolMesh: THREE.Group | null = null;

  constructor(
    scene: THREE.Scene,
    private readonly world: World,
    private readonly notify: Notify,
    private readonly mode: Mode,
  ) {
    this.human = buildHuman({ shirt: 0x2f80c2, pants: 0x3b3b5c, hair: 0x4a2e1a });
    this.group = this.human.group;
    scene.add(this.group);
    this.respawn();
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  get onLand(): boolean {
    return this.boat === null && this.world.heightAt(this.position.x, this.position.z) >= 0;
  }

  get swimming(): boolean {
    return this.boat === null && this.world.heightAt(this.position.x, this.position.z) < 0;
  }

  respawn(): void {
    const home = this.world.home;
    this.group.position.set(home.center.x, home.height + HIP, home.center.y);
    this.hp = MAX_HP;
    this.hunger = MAX_HUNGER;
    this.swimTime = 0;
    this.vy = 0;
    this.boat = null;
    this.group.scale.setScalar(1);
    this.group.rotation.x = 0;
  }

  damage(amount: number, cause = 'The pirates got you.'): void {
    if (this.mode.invulnerable) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.notify(`${cause} You wake up on your home island.`);
      this.respawn();
    }
  }

  /** Restore hunger by eating. */
  eat(amount: number): void {
    this.hunger = Math.min(MAX_HUNGER, this.hunger + amount);
  }

  /** Put a tool in the right hand, or empty the hand with null. */
  hold(kind: ToolKind | null): void {
    if (this.toolMesh) {
      this.human.rightArm.remove(this.toolMesh);
      this.toolMesh = null;
    }
    if (!kind) return;
    const tool = buildTool(kind);
    tool.position.set(0, -0.62, 0.08);
    tool.rotation.x = Math.PI / 2; // grip in the hand, tip pointing forward
    this.human.rightArm.add(tool);
    this.toolMesh = tool;
  }

  /** Brief swing animation when hitting something. */
  swingArm(): void {
    this.swing = 0.3;
  }

  update(dt: number, input: Input, moveDir: THREE.Vector3, wind: THREE.Vector3, storm: number): void {
    this.swing = Math.max(0, this.swing - dt);
    const moving = moveDir.lengthSq() > 0;

    if (this.boat) {
      this.boat.drive(dt, moveDir, wind, this.world, storm);
      this.group.position.copy(this.boat.position).add(new THREE.Vector3(0, 1.2, 0));
      this.heading = this.boat.heading;
      this.group.rotation.y = this.heading;
      this.drainHunger(dt, HUNGER_IDLE);
      this.regenerate(dt);
      poseHuman(this.human, { walk: this.walk, moving: false, sneaking: false, swimming: false, swing: this.swing / 0.3 });
      return;
    }

    if (moving) {
      this.heading = Math.atan2(moveDir.x, moveDir.z);
      this.group.rotation.y = this.heading;
    }

    if (this.mode.flight && input.isDown('Space')) {
      this.flying = true;
      this.vy = 0;
      this.position.y += FLY_SPEED * dt;
    }

    const groundHere = this.world.heightAt(this.position.x, this.position.z);
    const inWater = groundHere < 0;
    const sneaking = input.sneaking && !inWater;
    const speed = inWater ? SWIM_SPEED : sneaking ? SNEAK_SPEED : WALK_SPEED;
    if (moving) this.walk += dt * speed * 1.6;

    const next = this.position.clone().addScaledVector(moveDir, speed * dt);
    if (inWater) next.addScaledVector(wind, dt * 0.5);
    this.position.x = next.x;
    this.position.z = next.z;

    const ground = this.world.heightAt(this.position.x, this.position.z);
    const swimming = ground < 0;
    poseHuman(this.human, { walk: this.walk, moving, sneaking, swimming, swing: this.swing / 0.3 });
    this.drainHunger(dt, swimming ? HUNGER_SWIM : moving ? HUNGER_WALK : HUNGER_IDLE);

    if (this.flying) {
      // Descend gently when Space is released, and land on whatever is below.
      if (!input.isDown('Space')) {
        this.position.y -= FLY_SPEED * 0.6 * dt;
        const floorHere = Math.max(ground, 0) + HIP;
        if (this.position.y <= floorHere) {
          this.position.y = floorHere;
          this.flying = false;
        }
      }
      return;
    }

    if (swimming) {
      this.swimTime += dt * (1 + storm);
      if (this.position.y > SWIM_Y + 0.05) {
        this.vy -= GRAVITY * dt;
        this.position.y = Math.max(SWIM_Y, this.position.y + this.vy * dt);
      } else {
        this.vy = 0;
        this.position.y = SWIM_Y + Math.sin(performance.now() / 300) * 0.05;
      }
      this.grounded = false;
      if (this.swimTime >= SWIM_LIMIT && !this.mode.invulnerable) {
        this.notify('You drowned! Back to your home island.');
        this.respawn();
      }
      return;
    }

    this.swimTime = Math.max(0, this.swimTime - dt * 2);
    this.regenerate(dt);

    const floor = ground + HIP;
    if (this.grounded && input.jump) {
      this.vy = JUMP_SPEED;
      this.grounded = false;
    }
    if (!this.grounded || this.position.y > floor) {
      this.vy -= GRAVITY * dt;
      this.position.y += this.vy * dt;
      if (this.position.y <= floor) {
        this.position.y = floor;
        this.vy = 0;
        this.grounded = true;
      }
    } else {
      this.position.y = floor;
    }
  }

  /** Health comes back when you're well fed, fastest at full hunger. Regenerating costs a little hunger. */
  private regenerate(dt: number): void {
    if (this.hunger < REGEN_HUNGER || this.hp >= MAX_HP) return;
    const strength = (this.hunger - REGEN_HUNGER) / (MAX_HUNGER - REGEN_HUNGER); // 0..1
    this.hp = Math.min(MAX_HP, this.hp + REGEN_RATE * (0.5 + strength * 0.5) * dt);
    this.hunger -= 0.4 * dt;
  }

  private drainHunger(dt: number, rate: number): void {
    if (this.mode.invulnerable) return;
    this.hunger = Math.max(0, this.hunger - rate * dt);
    if (this.hunger <= 0) this.damage(STARVE_DAMAGE * dt, 'You starved.');
  }
}
