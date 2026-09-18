import * as THREE from 'three';
import type { Input } from './input';
import type { World } from './world';
import type { Boat } from './boat';

const WALK_SPEED = 8;
const SNEAK_SPEED = 3;
const SWIM_SPEED = 4;
const JUMP_SPEED = 8;
const GRAVITY = 22;
const EYE = 0.8; // capsule center above the ground
const SWIM_Y = 0.35;
export const SWIM_LIMIT = 10;
export const MAX_HP = 100;

export type Notify = (message: string) => void;

export class Player {
  readonly mesh: THREE.Mesh;
  hp = MAX_HP;
  swimTime = 0;
  boat: Boat | null = null;
  heading = Math.PI;
  private vy = 0;
  private grounded = true;
  private swing = 0;

  constructor(scene: THREE.Scene, private readonly world: World, private readonly notify: Notify) {
    this.mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0xe25822 }),
    );
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.respawn();
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  get onLand(): boolean {
    return this.boat === null && this.world.heightAt(this.position.x, this.position.z) >= 0;
  }

  get swimming(): boolean {
    return this.boat === null && this.world.heightAt(this.position.x, this.position.z) < 0;
  }

  respawn(): void {
    const home = this.world.home;
    this.mesh.position.set(home.center.x, home.height + EYE, home.center.y);
    this.hp = MAX_HP;
    this.swimTime = 0;
    this.vy = 0;
    this.boat = null;
    this.mesh.scale.setScalar(1);
  }

  damage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.notify('The pirates got you. You wake up on your home island.');
      this.respawn();
    }
  }

  /** Brief swing animation when hitting something. */
  swingArm(): void {
    this.swing = 0.25;
  }

  update(dt: number, input: Input, moveDir: THREE.Vector3, wind: THREE.Vector3, storm: number): void {
    if (this.swing > 0) {
      this.swing -= dt;
      this.mesh.rotation.x = Math.sin(this.swing * 25) * 0.5;
    } else {
      this.mesh.rotation.x = 0;
    }

    if (this.boat) {
      this.boat.drive(dt, moveDir, wind, this.world, storm);
      this.mesh.position.copy(this.boat.position).add(new THREE.Vector3(0, 1.1, 0));
      this.heading = this.boat.heading;
      this.mesh.rotation.y = this.heading;
      return;
    }

    const moving = moveDir.lengthSq() > 0;
    if (moving) {
      this.heading = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = this.heading;
    }

    const groundHere = this.world.heightAt(this.position.x, this.position.z);
    const inWater = groundHere < 0;
    const sneaking = input.sneaking && !inWater;
    const speed = inWater ? SWIM_SPEED : sneaking ? SNEAK_SPEED : WALK_SPEED;
    this.mesh.scale.y = sneaking ? 0.65 : 1;

    const next = this.position.clone().addScaledVector(moveDir, speed * dt);
    if (inWater) next.addScaledVector(wind, dt * 0.5);
    this.position.x = next.x;
    this.position.z = next.z;

    const ground = this.world.heightAt(this.position.x, this.position.z);
    if (ground < 0) {
      this.swimTime += dt * (1 + storm);
      if (this.position.y > SWIM_Y + 0.05) {
        this.vy -= GRAVITY * dt;
        this.position.y = Math.max(SWIM_Y, this.position.y + this.vy * dt);
      } else {
        this.vy = 0;
        this.position.y = SWIM_Y + Math.sin(performance.now() / 300) * 0.05;
      }
      this.grounded = false;
      if (this.swimTime >= SWIM_LIMIT) {
        this.notify('You drowned! Back to your home island.');
        this.respawn();
      }
      return;
    }

    this.swimTime = Math.max(0, this.swimTime - dt * 2);
    this.hp = Math.min(MAX_HP, this.hp + 2 * dt);

    const floor = ground + EYE;
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
}
