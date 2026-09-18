import * as THREE from 'three';
import type { Player } from './player';
import type { Island, World } from './world';
import { buildHuman, poseHuman, type Human } from './human';

const PIRATE_HP = 3;
const PIRATE_SPEED = 4.5;
const ATTACK_RANGE = 1.8;
const ATTACK_DAMAGE = 8;
const ATTACK_COOLDOWN = 1;
const RAID_SIZE = 3;

interface Pirate {
  readonly group: THREE.Group;
  readonly human: Human;
  hp: number;
  cooldown: number;
  walk: number;
  swing: number;
}

const hatMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

/** Every so often a pirate ship arrives at your island and its crew comes for you. */
export class Pirates {
  private raidTimer = 150;
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
      // Local +Z points away from the island, so this sails out to sea.
      this.ship.translateZ(6 * dt);
      if (this.leaving > 10) {
        this.scene.remove(this.ship);
        this.ship = null;
        this.raidTimer = 240 + Math.random() * 180;
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
      p.swing = Math.max(0, p.swing - dt);
      const toPlayer = player.position.clone().sub(p.group.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();
      const chasing = dist > ATTACK_RANGE * 0.8;
      if (chasing) {
        toPlayer.normalize();
        p.group.position.addScaledVector(toPlayer, PIRATE_SPEED * dt);
        p.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
        p.walk += dt * PIRATE_SPEED * 1.6;
      }
      const ground = this.world.heightAt(p.group.position.x, p.group.position.z);
      const swimming = ground < 0;
      p.group.position.y = swimming ? 0.35 : ground + 0.8;
      poseHuman(p.human, { walk: p.walk, moving: chasing, sneaking: false, swimming, swing: p.swing / 0.3 });
      if (dist <= ATTACK_RANGE && p.cooldown === 0 && !player.boat) {
        p.cooldown = ATTACK_COOLDOWN;
        p.swing = 0.3;
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
  nearestAlive(from: THREE.Vector3): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestDist = Infinity;
    for (const p of this.pirates) {
      const d = p.group.position.distanceTo(from);
      if (d < bestDist) {
        bestDist = d;
        best = p.group.position;
      }
    }
    return best;
  }

  hit(from: THREE.Vector3, range: number, damage: number): { hit: boolean; defeated: boolean } {
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
    best.hp -= damage;
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
      const human = buildPirate();
      const side = (i - 1) * 2.5;
      human.group.position.set(shipPos.x + out.y * side, 0.8, shipPos.y - out.x * side);
      this.scene.add(human.group);
      this.pirates.push({ group: human.group, human, hp: PIRATE_HP, cooldown: 1.5, walk: 0, swing: 0 });
    }
    notify('Pirates! A ship has landed on your island. Hit them with E.');
  }
}

function buildPirate(): Human {
  const human = buildHuman({ shirt: 0x8b0000, pants: 0x1a1a1a, hair: 0x111111 });
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.35, 8), hatMat);
  hat.position.y = 1.2;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 12), hatMat);
  brim.position.y = 1.05;
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.03), hatMat);
  patch.position.set(0.08, 0.93, 0.21);
  const cutlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.7, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8, roughness: 0.3 }),
  );
  cutlass.position.set(0, -0.9, 0.1);
  human.rightArm.add(cutlass);
  human.group.add(hat, brim, patch);
  return human;
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
