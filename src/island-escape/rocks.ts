import * as THREE from 'three';
import { seededRandom } from './random';
import type { World } from './world';

const HITS_TO_DEPLETE = 5;
const REGROW_SECONDS = 150;
const CAVE_RADIUS = 4.5;

interface Rock {
  readonly group: THREE.Group;
  readonly pos: THREE.Vector3;
  /** Stone per hit before tool bonus. Ore inside caves gives more. */
  readonly yield: number;
  hits: number;
  regrow: number;
  shake: number;
}

interface Cave {
  readonly dome: THREE.Mesh;
  readonly center: THREE.Vector3;
}

const rockMat = new THREE.MeshStandardMaterial({ color: 0x7d7d7d, roughness: 0.9 });
const oreMat = new THREE.MeshStandardMaterial({ color: 0x5c6b78, roughness: 0.5, metalness: 0.4 });

/** Boulders on the islands and caves with richer ore inside. Hit them for stone. */
export class Rocks {
  private readonly rocks: Rock[] = [];
  private readonly caves: Cave[] = [];

  constructor(private readonly scene: THREE.Scene, world: World) {
    const rand = seededRandom(99);
    world.islands.forEach((island, index) => {
      if (island.isCity) return;
      const count = 1 + Math.floor(island.radius / 5);
      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2;
        const dist = 4 + rand() * (island.radius * 0.66 - 4);
        this.addRock(
          new THREE.Vector3(island.center.x + Math.cos(angle) * dist, island.height, island.center.y + Math.sin(angle) * dist),
          0.6 + rand() * 0.6,
          rockMat,
          1,
        );
      }
      // Caves on the home island and every third island after it.
      if (index === 0 || index % 3 === 0) {
        const angle = rand() * Math.PI * 2;
        const dist = island.radius * 0.45;
        const center = new THREE.Vector3(
          island.center.x + Math.cos(angle) * dist,
          island.height,
          island.center.y + Math.sin(angle) * dist,
        );
        this.addCave(center, angle, rand);
      }
    });
  }

  private addRock(pos: THREE.Vector3, size: number, mat: THREE.Material, yieldPerHit: number): void {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), mat);
    mesh.position.y = size * 0.6;
    mesh.rotation.set(Math.random(), Math.random(), 0);
    mesh.castShadow = true;
    group.add(mesh);
    group.position.copy(pos);
    this.scene.add(group);
    this.rocks.push({ group, pos, yield: yieldPerHit, hits: 0, regrow: 0, shake: 0 });
  }

  private addCave(center: THREE.Vector3, facing: number, rand: () => number): void {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(CAVE_RADIUS, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 1, side: THREE.DoubleSide, transparent: true }),
    );
    dome.position.copy(center);
    dome.castShadow = true;
    dome.receiveShadow = true;
    this.scene.add(dome);

    // A dark arch marks the entrance, facing away from the island centre.
    const arch = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.6, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a }),
    );
    arch.position.set(center.x + Math.cos(facing) * (CAVE_RADIUS - 0.1), center.y + 1.3, center.z + Math.sin(facing) * (CAVE_RADIUS - 0.1));
    arch.rotation.y = -facing + Math.PI / 2;
    this.scene.add(arch);

    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      const d = 1 + rand() * 2;
      this.addRock(
        new THREE.Vector3(center.x + Math.cos(a) * d, center.y, center.z + Math.sin(a) * d),
        0.5 + rand() * 0.4,
        oreMat,
        2,
      );
    }
    this.caves.push({ dome, center });
  }

  /** Hit the nearest rock within range. Returns stone gained, or null if no rock. */
  hit(from: THREE.Vector3, range: number, bonus: number): { stone: number; depleted: boolean } | null {
    let best: Rock | null = null;
    let bestDist = range;
    for (const r of this.rocks) {
      if (r.regrow > 0) continue;
      const d = r.pos.distanceTo(from);
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    }
    if (!best) return null;
    best.hits += 1;
    best.shake = 0.25;
    const stone = best.yield * bonus;
    if (best.hits >= HITS_TO_DEPLETE) {
      best.regrow = REGROW_SECONDS;
      best.hits = 0;
      best.group.visible = false;
      return { stone: stone + 1, depleted: true };
    }
    return { stone, depleted: false };
  }

  nearestStanding(from: THREE.Vector3): THREE.Vector3 | null {
    let best: THREE.Vector3 | null = null;
    let bestDist = Infinity;
    for (const r of this.rocks) {
      if (r.regrow > 0) continue;
      const d = r.pos.distanceTo(from);
      if (d < bestDist) {
        bestDist = d;
        best = r.pos;
      }
    }
    return best;
  }

  update(dt: number, player: THREE.Vector3): void {
    for (const r of this.rocks) {
      if (r.regrow > 0) {
        r.regrow -= dt;
        if (r.regrow <= 0) r.group.visible = true;
        continue;
      }
      if (r.shake > 0) {
        r.shake -= dt;
        r.group.position.y = r.pos.y + Math.abs(Math.sin(r.shake * 40)) * 0.1;
      } else {
        r.group.position.y = r.pos.y;
      }
    }
    for (const c of this.caves) {
      const inside = c.center.distanceTo(player) < CAVE_RADIUS + 1.5;
      const mat = c.dome.material as THREE.MeshStandardMaterial;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, inside ? 0.3 : 1, 0.15);
    }
  }
}

