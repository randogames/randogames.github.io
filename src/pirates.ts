import * as THREE from 'three';
import type { Player } from './player';
import type { Island, World } from './world';

const PIRATE_HP = 3;
const PIRATE_SPEED = 4.5;
const ATTACK_RANGE = 1.8;
const ATTACK_DAMAGE = 8;
const ATTACK_COOLDOWN = 1;
const RAID_SIZE = 3;

interface Pirate {
  readonly group: THREE.Group;
  hp: number;
  cooldown: number;
}

const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
const hatMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

/** Every so often a pirate ship arrives at your island and its crew comes for you. */
export class Pirates {
  private raidTimer = 50;
  private ship: THREE.Group | null = null;
  private leaving = 0;
  private pirates: Pirate[] = [];
  private raidIsland: Island | null = null;

  constructor(private readonly scene: THREE.Scene, private readonly world: World) {}

  get active(): boolean {
    return this.pirates.length > 0;
  }

  update(dt: number, player: Player, notify: (m: string) => void): void {
    if (this.pirates.length === 0 && !this.ship) {
      if (player.onLand && !this.world.islandAt(player.position.x, player.position.z)?.isCity) {
        this.raidTimer -= dt;
        if (this.raidTimer <= 0) this.startRaid(player, notify);
      }
      return;
    }

    if (this.ship && this.pirates.length === 0) {
      this.leaving += dt;
      this.ship.translateZ(-6 * dt);
      if (this.leaving > 8) {
        this.scene.remove(this.ship);
        this.ship = null;
        this.raidTimer = 90 + Math.random() * 60;
      }
      return;
    }

    if (this.raidIsland) {
      const far = this.raidIsland.center.distanceTo(new THREE.Vector2(player.position.x, player.position.z));
      if (far > this.raidIsland.radius + 45) {
        for (const p of this.pirates) this.scene.remove(p.group);
        this.pirates = [];
        notify('The pirates lost you and sailed off.');
        return;
      }
    }

    for (const p of this.pirates) {
      p.cooldown = Math.max(0, p.cooldown - dt);
      const toPlayer = player.position.clone().sub(p.group.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      if (dist > ATTACK_RANGE * 0.8) {
        toPlayer.normalize();
        p.group.position.addScaledVector(toPlayer, PIRATE_SPEED * dt);
        p.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
      }
      const ground = this.world.heightAt(p.group.position.x, p.group.position.z);
      p.group.position.y = Math.max(ground, 0) + 0.8;
      if (dist <= ATTACK_RANGE && p.cooldown === 0 && !player.boat) {
        p.cooldown = ATTACK_COOLDOWN;
        player.damage(ATTACK_DAMAGE);
        if (player.hp === 100 && player.position.distanceTo(p.group.position) > 20) {
          // Player just respawned somewhere else; raid ends.
          for (const q of this.pirates) this.scene.remove(q.group);
          this.pirates = [];
          return;
        }
      }
    }
  }

  /** Hit the nearest pirate within range. Returns true if one was hit, plus wood if it was defeated. */
  hit(from: THREE.Vector3, range: number): { hit: boolean; defeated: boolean } {
    let best: Pirate | null = null;
    let bestDist = range;
    for (const p of this.pirates) {
      const d = p.group.position.distanceTo(from);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    if (!best) return { hit: false, defeated: false };
    best.hp -= 1;
    const push = best.group.position.clone().sub(from).setY(0).normalize().multiplyScalar(1.5);
    best.group.position.add(push);
    if (best.hp <= 0) {
      this.scene.remove(best.group);
      this.pirates = this.pirates.filter((p) => p !== best);
      return { hit: true, defeated: true };
    }
    return { hit: true, defeated: false };
  }

  startRaid(player: Player, notify: (m: string) => void): void {
    const island = this.world.nearestIsland(player.position.x, player.position.z);
    this.raidIsland = island;
    const out = new THREE.Vector2(player.position.x, player.position.z).sub(island.center);
    if (out.lengthSq() < 0.01) out.set(1, 0);
    out.normalize();
    const shipPos = island.center.clone().addScaledVector(out, island.radius * 1.3 + 10);

    this.ship = buildShip();
    this.ship.position.set(shipPos.x, 0.3, shipPos.y);
    this.ship.rotation.y = Math.atan2(out.x, out.y);
    this.scene.add(this.ship);
    this.leaving = 0;

    for (let i = 0; i < RAID_SIZE; i++) {
      const group = buildPirate();
      const side = (i - 1) * 2.5;
      group.position.set(shipPos.x + out.y * side, 0.8, shipPos.y - out.x * side);
      this.scene.add(group);
      this.pirates.push({ group, hp: PIRATE_HP, cooldown: 1.5 });
    }
    notify('Pirates! A ship has landed on your island. Hit them with E.');
  }
}

function buildPirate(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 8), bodyMat);
  body.castShadow = true;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 8), hatMat);
  hat.position.y = 1;
  group.add(body, hat);
  return group;
}

function buildShip(): THREE.Group {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1.2, 9),
    new THREE.MeshStandardMaterial({ color: 0x3b2314 }),
  );
  hull.castShadow = true;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 7, 8), hatMat);
  mast.position.y = 4;
  const sail = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide }),
  );
  sail.position.set(0, 4.5, -0.3);
  group.add(hull, mast, sail);
  return group;
}
