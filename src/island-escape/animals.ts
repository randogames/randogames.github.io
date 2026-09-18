import * as THREE from 'three';
import { seededRandom } from './random';
import type { Island, World } from './world';

const RESPAWN_SECONDS = 150;

type Kind = 'chicken' | 'pig';

interface Animal {
  readonly kind: Kind;
  readonly group: THREE.Group;
  readonly island: Island;
  readonly target: THREE.Vector3;
  hp: number;
  pause: number;
  flee: number;
  respawn: number;
  bob: number;
}

const STATS: Record<Kind, { hp: number; meat: number; speed: number; size: number }> = {
  chicken: { hp: 1, meat: 1, speed: 1.8, size: 0.35 },
  pig: { hp: 2, meat: 2, speed: 1.4, size: 0.55 },
};

const white = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
const yellow = new THREE.MeshStandardMaterial({ color: 0xf2b134 });
const red = new THREE.MeshStandardMaterial({ color: 0xd32f2f });
const pink = new THREE.MeshStandardMaterial({ color: 0xf1a7b7 });
const dark = new THREE.MeshStandardMaterial({ color: 0x222222 });

/** Chickens and pigs that wander the islands. Hit them for raw meat. */
export class Animals {
  private readonly animals: Animal[] = [];
  private readonly rand = seededRandom(1234);

  constructor(private readonly scene: THREE.Scene, world: World) {
    for (const island of world.islands) {
      if (island.isCity) continue;
      const count = 2 + Math.floor(island.radius / 6);
      for (let i = 0; i < count; i++) {
        const kind: Kind = this.rand() < 0.55 ? 'chicken' : 'pig';
        const group = kind === 'chicken' ? buildChicken() : buildPig();
        const pos = this.randomSpot(island);
        group.position.copy(pos);
        scene.add(group);
        this.animals.push({
          kind, group, island, target: pos.clone(), hp: STATS[kind].hp,
          pause: this.rand() * 3, flee: 0, respawn: 0, bob: this.rand() * 10,
        });
      }
    }
  }

  private randomSpot(island: Island): THREE.Vector3 {
    const a = this.rand() * Math.PI * 2;
    const d = this.rand() * island.radius * 0.65;
    return new THREE.Vector3(island.center.x + Math.cos(a) * d, island.height, island.center.y + Math.sin(a) * d);
  }

  nearestAlive(from: THREE.Vector3): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestDist = Infinity;
    for (const a of this.animals) {
      if (a.respawn > 0) continue;
      const d = a.group.position.distanceTo(from);
      if (d < bestDist) {
        bestDist = d;
        best = a.group.position;
      }
    }
    return best;
  }

  /** Hit the nearest animal within range. Returns meat gained (0 if it survived), or null if none. */
  hit(from: THREE.Vector3, range: number, damage: number): { meat: number; killed: boolean; kind: Kind } | null {
    let best: Animal | null = null;
    let bestDist = range;
    for (const a of this.animals) {
      if (a.respawn > 0) continue;
      const d = a.group.position.distanceTo(from);
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    if (!best) return null;
    best.hp -= damage;
    best.flee = 3;
    const away = best.group.position.clone().sub(from).setY(0).normalize().multiplyScalar(6);
    best.target.copy(best.group.position).add(away);
    if (best.hp <= 0) {
      best.respawn = RESPAWN_SECONDS;
      best.group.visible = false;
      return { meat: STATS[best.kind].meat, killed: true, kind: best.kind };
    }
    return { meat: 0, killed: false, kind: best.kind };
  }

  update(dt: number): void {
    for (const a of this.animals) {
      if (a.respawn > 0) {
        a.respawn -= dt;
        if (a.respawn <= 0) {
          a.hp = STATS[a.kind].hp;
          a.group.position.copy(this.randomSpot(a.island));
          a.target.copy(a.group.position);
          a.group.visible = true;
        }
        continue;
      }
      a.flee = Math.max(0, a.flee - dt);
      const to = a.target.clone().sub(a.group.position).setY(0);
      const dist = to.length();
      if (dist < 0.3) {
        a.pause -= dt;
        if (a.pause <= 0) {
          a.target.copy(this.randomSpot(a.island));
          a.pause = 1 + this.rand() * 4;
        }
        continue;
      }
      const speed = STATS[a.kind].speed * (a.flee > 0 ? 3 : 1);
      to.normalize();
      const next = a.group.position.clone().addScaledVector(to, speed * dt);
      // Stay on the island.
      const fromCenter = new THREE.Vector2(next.x, next.z).sub(a.island.center);
      if (fromCenter.length() > a.island.radius * 0.7) {
        a.target.copy(this.randomSpot(a.island));
        continue;
      }
      a.group.position.copy(next);
      a.group.rotation.y = Math.atan2(to.x, to.z);
      a.bob += dt * speed * 6;
      a.group.position.y = a.island.height + Math.abs(Math.sin(a.bob)) * 0.08;
    }
  }
}

function buildChicken(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.55), white);
  body.position.y = 0.45;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.25), white);
  head.position.set(0, 0.8, 0.28);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.12), yellow);
  beak.position.set(0, 0.78, 0.45);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.15), red);
  comb.position.set(0, 0.98, 0.28);
  for (const x of [-0.1, 0.1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), yellow);
    leg.position.set(x, 0.12, 0);
    g.add(leg);
  }
  g.add(body, head, beak, comb);
  return g;
}

function buildPig(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 1), pink);
  body.position.y = 0.55;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.4), pink);
  head.position.set(0, 0.65, 0.65);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), red);
  snout.position.set(0, 0.58, 0.88);
  for (const x of [-0.12, 0.12]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), dark);
    eye.position.set(x, 0.75, 0.86);
    g.add(eye);
  }
  for (const [x, z] of [[-0.2, -0.3], [0.2, -0.3], [-0.2, 0.3], [0.2, 0.3]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), pink);
    leg.position.set(x, 0.15, z);
    g.add(leg);
  }
  g.add(body, head, snout);
  return g;
}
